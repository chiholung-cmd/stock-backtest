#!/usr/bin/env python3
"""
Stock Backtest Engine
Supports: MA Crossover, RSI, MACD, Bollinger Bands, KD, Price Action
Data Source: Yahoo Finance (yfinance)
"""

import json
import sys
import math
from datetime import datetime
import numpy as np
import pandas as pd
import yfinance as yf


def fetch_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch OHLCV data from Yahoo Finance."""
    try:
        df = yf.download(ticker, start=start_date, end=end_date, progress=False, auto_adjust=True)
        if df.empty:
            raise ValueError(f"No data found for ticker {ticker}")
        # Flatten multi-level columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df = df[['Open', 'High', 'Low', 'Close', 'Volume']].dropna()
        return df
    except Exception as e:
        raise ValueError(f"Failed to fetch data for {ticker}: {str(e)}")


def calculate_performance(equity_curve: pd.Series, trades: list, risk_free_rate: float = 0.04) -> dict:
    """Calculate performance metrics from equity curve."""
    if len(equity_curve) < 2:
        return {
            "annualizedReturn": 0.0,
            "maxDrawdown": 0.0,
            "sharpeRatio": 0.0,
            "winRate": 0.0,
            "totalTrades": 0,
        }

    # Annualized Return
    total_days = (equity_curve.index[-1] - equity_curve.index[0]).days
    if total_days <= 0:
        total_days = 1
    total_return = (equity_curve.iloc[-1] / equity_curve.iloc[0]) - 1
    annualized_return = (1 + total_return) ** (365.0 / total_days) - 1

    # Max Drawdown
    rolling_max = equity_curve.cummax()
    drawdown = (equity_curve - rolling_max) / rolling_max
    max_drawdown = float(drawdown.min())

    # Sharpe Ratio (annualized)
    daily_returns = equity_curve.pct_change().dropna()
    if len(daily_returns) > 1 and daily_returns.std() > 0:
        excess_returns = daily_returns - (risk_free_rate / 252)
        sharpe_ratio = float((excess_returns.mean() / excess_returns.std()) * math.sqrt(252))
    else:
        sharpe_ratio = 0.0

    # Win Rate & Total Trades
    completed_trades = [t for t in trades if t.get("pnl") is not None]
    total_trades = len(completed_trades)
    if total_trades > 0:
        winning_trades = sum(1 for t in completed_trades if t["pnl"] > 0)
        win_rate = winning_trades / total_trades
    else:
        win_rate = 0.0

    return {
        "annualizedReturn": round(float(annualized_return), 4),
        "maxDrawdown": round(float(max_drawdown), 4),
        "sharpeRatio": round(sharpe_ratio, 4),
        "winRate": round(win_rate, 4),
        "totalTrades": total_trades,
    }


def simulate_trades(df: pd.DataFrame, signals: pd.Series, initial_capital: float = 10000.0):
    """Simulate trades based on signals. Returns equity curve and trade list."""
    equity = initial_capital
    position = 0.0  # shares held
    entry_price = 0.0
    equity_curve = []
    trades = []

    for date, row in df.iterrows():
        price = float(row["Close"])
        signal = signals.get(date, 0)

        if signal == 1 and position == 0:  # Buy
            shares = equity / price
            position = shares
            entry_price = price
            equity = 0.0
            trades.append({
                "date": str(date.date()),
                "action": "BUY",
                "price": round(price, 2),
                "pnl": None,
            })
        elif signal == -1 and position > 0:  # Sell
            equity = position * price
            pnl = (price - entry_price) / entry_price
            trades.append({
                "date": str(date.date()),
                "action": "SELL",
                "price": round(price, 2),
                "pnl": round(pnl, 4),
            })
            position = 0.0
            entry_price = 0.0

        # Current equity value
        current_value = equity + position * price
        equity_curve.append({
            "date": str(date.date()),
            "value": round(current_value, 2),
        })

    # Close any open position at end
    if position > 0:
        last_price = float(df["Close"].iloc[-1])
        equity = position * last_price
        pnl = (last_price - entry_price) / entry_price
        trades.append({
            "date": str(df.index[-1].date()),
            "action": "SELL (Close)",
            "price": round(last_price, 2),
            "pnl": round(pnl, 4),
        })

    equity_series = pd.Series(
        [e["value"] for e in equity_curve],
        index=df.index,
    )
    return equity_curve, equity_series, trades


# ─── Strategy: MA Crossover ────────────────────────────────────────────────────

def strategy_ma_crossover(df: pd.DataFrame, params: dict):
    short_period = int(params.get("shortPeriod", 10))
    long_period = int(params.get("longPeriod", 30))

    df = df.copy()
    df["ma_short"] = df["Close"].rolling(short_period).mean()
    df["ma_long"] = df["Close"].rolling(long_period).mean()
    df = df.dropna()

    signals = pd.Series(0, index=df.index)
    prev_short = df["ma_short"].shift(1)
    prev_long = df["ma_long"].shift(1)

    # Golden cross: short crosses above long → Buy
    signals[(df["ma_short"] > df["ma_long"]) & (prev_short <= prev_long)] = 1
    # Death cross: short crosses below long → Sell
    signals[(df["ma_short"] < df["ma_long"]) & (prev_short >= prev_long)] = -1

    return df, signals


# ─── Strategy: RSI ────────────────────────────────────────────────────────────

def strategy_rsi(df: pd.DataFrame, params: dict):
    period = int(params.get("period", 14))
    oversold = float(params.get("oversold", 30))
    overbought = float(params.get("overbought", 70))

    df = df.copy()
    delta = df["Close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi"] = 100 - (100 / (1 + rs))
    df = df.dropna()

    signals = pd.Series(0, index=df.index)
    prev_rsi = df["rsi"].shift(1)

    # RSI crosses above oversold → Buy
    signals[(df["rsi"] > oversold) & (prev_rsi <= oversold)] = 1
    # RSI crosses below overbought → Sell
    signals[(df["rsi"] < overbought) & (prev_rsi >= overbought)] = -1

    return df, signals


# ─── Strategy: MACD ───────────────────────────────────────────────────────────

def strategy_macd(df: pd.DataFrame, params: dict):
    fast = int(params.get("fastPeriod", 12))
    slow = int(params.get("slowPeriod", 26))
    signal_period = int(params.get("signalPeriod", 9))

    df = df.copy()
    ema_fast = df["Close"].ewm(span=fast, adjust=False).mean()
    ema_slow = df["Close"].ewm(span=slow, adjust=False).mean()
    df["macd"] = ema_fast - ema_slow
    df["macd_signal"] = df["macd"].ewm(span=signal_period, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]
    df = df.dropna()

    signals = pd.Series(0, index=df.index)
    prev_macd = df["macd"].shift(1)
    prev_signal = df["macd_signal"].shift(1)

    # MACD crosses above signal → Buy
    signals[(df["macd"] > df["macd_signal"]) & (prev_macd <= prev_signal)] = 1
    # MACD crosses below signal → Sell
    signals[(df["macd"] < df["macd_signal"]) & (prev_macd >= prev_signal)] = -1

    return df, signals


# ─── Strategy: Bollinger Bands ────────────────────────────────────────────────

def strategy_bollinger_bands(df: pd.DataFrame, params: dict):
    period = int(params.get("period", 20))
    std_dev = float(params.get("stdDev", 2.0))

    df = df.copy()
    df["bb_mid"] = df["Close"].rolling(period).mean()
    df["bb_std"] = df["Close"].rolling(period).std()
    df["bb_upper"] = df["bb_mid"] + std_dev * df["bb_std"]
    df["bb_lower"] = df["bb_mid"] - std_dev * df["bb_std"]
    df = df.dropna()

    signals = pd.Series(0, index=df.index)
    prev_close = df["Close"].shift(1)
    prev_lower = df["bb_lower"].shift(1)
    prev_upper = df["bb_upper"].shift(1)

    # Price crosses above lower band → Buy
    signals[(df["Close"] > df["bb_lower"]) & (prev_close <= prev_lower)] = 1
    # Price crosses above upper band → Sell
    signals[(df["Close"] > df["bb_upper"]) & (prev_close <= prev_upper)] = -1

    return df, signals


# ─── Strategy: KD (Stochastic Oscillator) ──────────────────────────────────────

def strategy_kd(df: pd.DataFrame, params: dict):
    k_period = int(params.get("kPeriod", 9))
    d_period = int(params.get("dPeriod", 3))
    
    df = df.copy()
    low_min = df["Low"].rolling(window=k_period).min()
    high_max = df["High"].rolling(window=k_period).max()
    
    df["rsv"] = 100 * (df["Close"] - low_min) / (high_max - low_min)
    df["k"] = df["rsv"].ewm(com=2).mean() # Standard KD uses alpha=1/3
    df["d"] = df["k"].ewm(com=2).mean()
    df = df.dropna()
    
    signals = pd.Series(0, index=df.index)
    prev_k = df["k"].shift(1)
    prev_d = df["d"].shift(1)
    
    # K crosses above D → Buy
    signals[(df["k"] > df["d"]) & (prev_k <= prev_d)] = 1
    # K crosses below D → Sell
    signals[(df["k"] < df["d"]) & (prev_k >= prev_d)] = -1
    
    return df, signals


# ─── Strategy: Price Action (Simple Breakout) ──────────────────────────────────

def strategy_breakout(df: pd.DataFrame, params: dict):
    lookback = int(params.get("lookback", 20))
    
    df = df.copy()
    df["high_max"] = df["High"].shift(1).rolling(window=lookback).max()
    df["low_min"] = df["Low"].shift(1).rolling(window=lookback).min()
    df = df.dropna()
    
    signals = pd.Series(0, index=df.index)
    
    # Price breaks above lookback high → Buy
    signals[df["Close"] > df["high_max"]] = 1
    # Price breaks below lookback low → Sell
    signals[df["Close"] < df["low_min"]] = -1
    
    return df, signals


# ─── Strategy: Predator MF (TQQQ Optimized) ──────────────────────────────────

def strategy_predator_mf(df: pd.DataFrame, params: dict):
    sma_fast_len = int(params.get("smaFast", 50))
    sma_slow_len = int(params.get("smaSlow", 200))
    rsi_len = int(params.get("rsiPeriod", 14))
    rsi_oversold = float(params.get("rsiOversold", 30))
    stop_loss_pct = float(params.get("stopLoss", 15.0)) / 100.0
    
    df = df.copy()
    df["sma_fast"] = df["Close"].rolling(sma_fast_len).mean()
    df["sma_slow"] = df["Close"].rolling(sma_slow_len).mean()
    
    # Calculate RSI
    delta = df["Close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(rsi_len).mean()
    avg_loss = loss.rolling(rsi_len).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi"] = 100 - (100 / (1 + rs))
    
    df = df.dropna()
    
    signals = pd.Series(0, index=df.index)
    position = 0
    entry_price = 0.0
    
    for i in range(len(df)):
        date = df.index[i]
        price = df["Close"].iloc[i]
        sma_fast = df["sma_fast"].iloc[i]
        sma_slow = df["sma_slow"].iloc[i]
        rsi = df["rsi"].iloc[i]
        
        if position == 0:
            # Buy logic: Price > SMA50 OR RSI < 30
            if price > sma_fast or rsi < rsi_oversold:
                signals.iloc[i] = 1
                position = 1
                entry_price = price
        else:
            # Sell logic:
            # 1. Hard Stop Loss
            if price <= entry_price * (1 - stop_loss_pct):
                signals.iloc[i] = -1
                position = 0
            # 2. Trend Exit: Price < SMA200
            elif price < sma_slow:
                signals.iloc[i] = -1
                position = 0
                
    return df, signals


# ─── Main Entry Point ─────────────────────────────────────────────────────────

STRATEGIES = {
    "ma_crossover": strategy_ma_crossover,
    "rsi": strategy_rsi,
    "macd": strategy_macd,
    "bollinger_bands": strategy_bollinger_bands,
    "kd": strategy_kd,
    "breakout": strategy_breakout,
    "predator_mf": strategy_predator_mf,
}


def run_backtest(ticker: str, strategy: str, params: dict, start_date: str, end_date: str) -> dict:
    """Run a full backtest and return results."""
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown strategy: {strategy}. Available: {list(STRATEGIES.keys())}")

    df = fetch_data(ticker, start_date, end_date)
    strategy_fn = STRATEGIES[strategy]
    df_with_indicators, signals = strategy_fn(df, params)

    equity_curve, equity_series, trades = simulate_trades(df_with_indicators, signals)
    metrics = calculate_performance(equity_series, trades)

    return {
        "ticker": ticker.upper(),
        "strategy": strategy,
        "strategyParams": params,
        "startDate": start_date,
        "endDate": end_date,
        "equityCurve": equity_curve,
        "trades": trades,
        **metrics,
    }


if __name__ == "__main__":
    # Called from Node.js via child_process: python3 backtest_engine.py <json_input>
    try:
        input_data = json.loads(sys.argv[1])
        result = run_backtest(
            ticker=input_data["ticker"],
            strategy=input_data["strategy"],
            params=input_data.get("params", {}),
            start_date=input_data["startDate"],
            end_date=input_data["endDate"],
        )
        print(json.dumps({"success": True, "data": result}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
