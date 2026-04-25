CREATE TABLE `backtest_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ticker` varchar(20) NOT NULL,
	`strategy` varchar(50) NOT NULL,
	`strategyParams` json NOT NULL,
	`startDate` varchar(20) NOT NULL,
	`endDate` varchar(20) NOT NULL,
	`annualizedReturn` float,
	`maxDrawdown` float,
	`sharpeRatio` float,
	`winRate` float,
	`totalTrades` int,
	`equityCurve` json,
	`trades` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backtest_results_id` PRIMARY KEY(`id`)
);
