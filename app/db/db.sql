

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


-- Database: `habesha_bingo`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`smegn`@`%` PROCEDURE `cleanup_old_games` ()   BEGIN
    -- Clean games older than 2 hours in waiting/countdown
    UPDATE multiplayer_games 
    SET status = 'cancelled', 
        ended_at = NOW(),
        auto_cleanup = 1
    WHERE status IN ('waiting', 'countdown') 
    AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR);
    
    -- Mark completed games for cleanup
    UPDATE multiplayer_games 
    SET auto_cleanup = 1
    WHERE status = 'completed' 
    AND ended_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
    -- Log cleanup
    SELECT CONCAT('Cleaned up ', ROW_COUNT(), ' old games') as message;
END$$

CREATE DEFINER=`smegn`@`%` PROCEDURE `cleanup_stale_games` ()   BEGIN
    -- Clean games older than 10 minutes
    UPDATE multiplayer_games 
    SET status = 'cancelled', ended_at = NOW()
    WHERE status IN ('countdown', 'waiting') 
    AND created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
    
    -- Release cartelas from cancelled games
    UPDATE cartela_card cc
    JOIN game_players gp ON cc.id = gp.cartela_id
    JOIN multiplayer_games mg ON gp.multiplayer_game_id = mg.id
    SET cc.is_available = 1
    WHERE mg.status = 'cancelled'
    AND gp.left_at IS NULL;
END$$

CREATE DEFINER=`smegn`@`%` PROCEDURE `GenerateBingoCards` ()   BEGIN
    DECLARE card_num INT DEFAULT 1;
    
    WHILE card_num <= 400 DO
        -- Generate random numbers for B column (1-15)
        SET @b1 = FLOOR(1 + RAND() * 15);
        SET @b2 = FLOOR(1 + RAND() * 15);
        SET @b3 = FLOOR(1 + RAND() * 15);
        SET @b4 = FLOOR(1 + RAND() * 15);
        SET @b5 = FLOOR(1 + RAND() * 15);
        
        -- Generate random numbers for I column (16-30)
        SET @i1 = FLOOR(16 + RAND() * 15);
        SET @i2 = FLOOR(16 + RAND() * 15);
        SET @i3 = FLOOR(16 + RAND() * 15);
        SET @i4 = FLOOR(16 + RAND() * 15);
        SET @i5 = FLOOR(16 + RAND() * 15);
        
        -- Generate random numbers for N column (31-45)
        SET @n1 = FLOOR(31 + RAND() * 15);
        SET @n2 = FLOOR(31 + RAND() * 15);
        SET @n3 = 0; -- Free space
        SET @n4 = FLOOR(31 + RAND() * 15);
        SET @n5 = FLOOR(31 + RAND() * 15);
        
        -- Generate random numbers for G column (46-60)
        SET @g1 = FLOOR(46 + RAND() * 15);
        SET @g2 = FLOOR(46 + RAND() * 15);
        SET @g3 = FLOOR(46 + RAND() * 15);
        SET @g4 = FLOOR(46 + RAND() * 15);
        SET @g5 = FLOOR(46 + RAND() * 15);
        
        -- Generate random numbers for O column (61-75)
        SET @o1 = FLOOR(61 + RAND() * 15);
        SET @o2 = FLOOR(61 + RAND() * 15);
        SET @o3 = FLOOR(61 + RAND() * 15);
        SET @o4 = FLOOR(61 + RAND() * 15);
        SET @o5 = FLOOR(61 + RAND() * 15);
        
        -- Create JSON array for the card
        SET @numbers = JSON_ARRAY(
            JSON_ARRAY(@b1, @i1, @n1, @g1, @o1),
            JSON_ARRAY(@b2, @i2, @n2, @g2, @o2),
            JSON_ARRAY(@b3, @i3, @n3, @g3, @o3),
            JSON_ARRAY(@b4, @i4, @n4, @g4, @o4),
            JSON_ARRAY(@b5, @i5, @n5, @g5, @o5)
        );
        
        -- Insert the card
        INSERT INTO cartelas (card_number, numbers) 
        VALUES (card_num, @numbers);
        
        SET card_num = card_num + 1;
    END WHILE;
END$$

DELIMITER ;


CREATE TABLE `approval_logs` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `admin_id` char(36) NOT NULL,
  `action_type` enum('deposit_approve','deposit_reject','withdrawal_approve','withdrawal_reject') NOT NULL,
  `target_id` char(36) NOT NULL,
  `target_type` enum('deposit','withdrawal') NOT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `bingo_cards` (
  `id` int NOT NULL,
  `cartela_id` int NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `card_data` json NOT NULL,
  `card_number` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `game_session_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



CREATE TABLE `cartela_card` (
  `id` int NOT NULL,
  `cartela_number` varchar(20) NOT NULL,
  `is_available` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



CREATE TABLE `deposits` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `user_id` char(36) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('telebirr','cbe') NOT NULL,
  `transaction_ref` varchar(100) DEFAULT NULL,
  `screenshot_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` char(36) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



INSERT INTO `deposits` (`id`, `user_id`, `amount`, `method`, `transaction_ref`, `screenshot_url`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
('0fb0c38a-ffba-11f0-b998-98e7f4364d07', '598f20a3-ffb6-11f0-b998-98e7f4364d07', 100.00, 'telebirr', NULL, NULL, 'approved', 'ab2fcb49-ff92-11f0-b998-98e7f4364d07', '2026-02-05 18:21:29', '2026-02-01 22:05:04', '2026-02-05 18:21:29'),
('4013f57b-ffba-11f0-b998-98e7f4364d07', 'b8154eb4-ffb4-11f0-b998-98e7f4364d07', 20.00, 'telebirr', NULL, NULL, 'approved', 'ab2fcb49-ff92-11f0-b998-98e7f4364d07', '2026-02-05 18:21:32', '2026-02-01 22:06:25', '2026-02-05 18:21:32');



CREATE TABLE `drawn_numbers` (
  `id` int NOT NULL,
  `multiplayer_game_id` int NOT NULL,
  `number` int NOT NULL,
  `drawn_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `drawn_by_user_id` char(36) DEFAULT NULL
) ;



CREATE TABLE `games` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `stake` decimal(10,2) NOT NULL,
  `status` enum('waiting','in_progress','completed') DEFAULT 'waiting',
  `winner_id` char(36) DEFAULT NULL,
  `win_pattern` varchar(20) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `game_code` varchar(20) DEFAULT NULL,
  `max_players` int DEFAULT '2',
  `current_players` int DEFAULT '0',
  `countdown_start` timestamp NULL DEFAULT NULL,
  `countdown_duration` int DEFAULT '50',
  `is_multiplayer` tinyint(1) DEFAULT '0',
  `host_id` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;




CREATE TABLE `game_history` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `user_id` char(36) NOT NULL,
  `game_id` char(36) NOT NULL,
  `cartela_id` int NOT NULL,
  `stake` decimal(10,2) NOT NULL,
  `result` enum('win','lose') NOT NULL,
  `win_pattern` varchar(20) DEFAULT NULL,
  `win_amount` decimal(10,2) DEFAULT NULL,
  `played_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



CREATE TABLE `game_numbers` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `game_id` char(36) NOT NULL,
  `number` int NOT NULL,
  `letter` enum('B','I','N','G','O') NOT NULL,
  `called_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ;



CREATE TABLE `game_number_calls` (
  `id` int NOT NULL,
  `session_id` int NOT NULL,
  `number` int NOT NULL,
  `called_by` varchar(36) NOT NULL,
  `called_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `game_players` (
  `id` int NOT NULL,
  `multiplayer_game_id` int NOT NULL,
  `user_id` char(36) NOT NULL,
  `cartela_id` int NOT NULL,
  `bingo_card_id` int NOT NULL,
  `game_session_id` int DEFAULT NULL,
  `player_status` enum('waiting','ready','playing','won','lost','left') DEFAULT 'waiting',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ready_at` timestamp NULL DEFAULT NULL,
  `win_declared_at` timestamp NULL DEFAULT NULL,
  `ready_status` enum('waiting','ready','playing','finished') DEFAULT 'waiting',
  `left_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



CREATE TABLE `game_players_queue` (
  `id` int NOT NULL,
  `session_id` int NOT NULL,
  `user_id` char(36) NOT NULL,
  `bingo_card_id` int NOT NULL,
  `status` enum('waiting','ready','playing','disconnected','finished','winner') DEFAULT 'waiting',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ready_at` timestamp NULL DEFAULT NULL,
  `left_at` timestamp NULL DEFAULT NULL,
  `is_spectator` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



CREATE TABLE `game_sessions` (
  `id` int NOT NULL,
  `session_code` varchar(50) NOT NULL,
  `status` enum('waiting','countdown','active','finished','cancelled') DEFAULT 'waiting',
  `countdown_start_at` timestamp NULL DEFAULT NULL,
  `countdown_duration` int DEFAULT '50',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `started_at` timestamp NULL DEFAULT NULL,
  `finished_at` timestamp NULL DEFAULT NULL,
  `winner_user_id` varchar(255) DEFAULT NULL,
  `winning_pattern` varchar(100) DEFAULT NULL,
  `called_numbers` text,
  `win_declared_at` timestamp NULL DEFAULT NULL,
  `called_numbers_queue` json DEFAULT NULL,
  `last_call_time` timestamp NULL DEFAULT NULL,
  `next_call_time` timestamp NULL DEFAULT NULL,
  `call_interval` int DEFAULT '5',
  `is_calling_active` tinyint(1) DEFAULT '0',
  `winning_player_id` varchar(255) DEFAULT NULL,
  `win_pattern` json DEFAULT NULL,
  `game_ended_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `global_lobby` (
  `id` int NOT NULL,
  `status` enum('open','waiting','closed') DEFAULT 'open',
  `session_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `global_lobby` (`id`, `status`, `session_id`, `created_at`, `updated_at`) VALUES
(1, 'open', NULL, '2026-02-11 08:41:38', '2026-02-11 08:41:38');



CREATE TABLE `multiplayer_games` (
  `id` int NOT NULL,
  `game_code` varchar(20) NOT NULL,
  `status` enum('waiting','countdown','playing','completed','cancelled') DEFAULT 'waiting',
  `countdown_start` timestamp NULL DEFAULT NULL,
  `countdown_duration` int DEFAULT '50',
  `max_players` int DEFAULT '2',
  `current_players` int DEFAULT '0',
  `winner_user_id` char(36) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `auto_start_countdown` tinyint(1) DEFAULT '0',
  `auto_start_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `auto_cleanup` tinyint(1) DEFAULT '0',
  `game_result` varchar(20) DEFAULT NULL,
  `host_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



INSERT INTO `multiplayer_games` (`id`, `game_code`, `status`, `countdown_start`, `countdown_duration`, `max_players`, `current_players`, `winner_user_id`, `started_at`, `completed_at`, `created_at`, `updated_at`, `auto_start_countdown`, `auto_start_at`, `ended_at`, `auto_cleanup`, `game_result`, `host_id`) VALUES
(40, 'BINGOKRYZ4T', 'playing', '2026-02-10 05:30:24', 50, 2, 2, NULL, '2026-02-10 05:37:57', NULL, '2026-02-10 05:29:43', '2026-02-10 05:37:57', 0, NULL, NULL, 0, NULL, NULL);


CREATE TABLE `multiplayer_game_numbers` (
  `id` int NOT NULL,
  `game_id` int NOT NULL,
  `number` int NOT NULL,
  `called_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `called_by` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `pending_approvals` (
`amount` decimal(10,2)
,`created_at` timestamp
,`id` char(36)
,`method` varchar(8)
,`type` varchar(10)
,`user_id` char(36)
,`username` varchar(50)
);



CREATE TABLE `referrals` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `referrer_id` char(36) NOT NULL,
  `referred_id` char(36) NOT NULL,
  `bonus_paid` tinyint(1) DEFAULT '0',
  `bonus_amount` decimal(10,2) DEFAULT '10.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



CREATE TABLE `transactions` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `user_id` char(36) NOT NULL,
  `type` enum('deposit','withdrawal','game_win','game_loss','bonus','referral_bonus','welcome_bonus','initial_bonus') DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `reference_id` char(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `users` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `telegram_id` varchar(50) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `balance` decimal(10,2) DEFAULT '50.00',
  `bonus_balance` decimal(10,2) DEFAULT '10.00',
  `referral_code` varchar(20) NOT NULL,
  `referred_by` char(36) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT '0',
  `last_active` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `telegram_user_id` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `user_stats` (
`balance` decimal(10,2)
,`bonus_balance` decimal(10,2)
,`first_name` varchar(100)
,`games_played` bigint
,`id` char(36)
,`referrals_count` bigint
,`total_won` decimal(32,2)
,`username` varchar(50)
,`wins_count` bigint
);



CREATE TABLE `withdrawals` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `user_id` char(36) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('telebirr','cbe') NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` char(36) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pending_approvals`;

CREATE ALGORITHM=UNDEFINED DEFINER=`smegn`@`%` SQL SECURITY DEFINER VIEW `pending_approvals`  AS SELECT 'deposit' AS `type`, `d`.`id` AS `id`, `d`.`user_id` AS `user_id`, `u`.`username` AS `username`, `d`.`amount` AS `amount`, `d`.`method` AS `method`, `d`.`created_at` AS `created_at` FROM (`deposits` `d` join `users` `u` on((`d`.`user_id` = `u`.`id`))) WHERE (`d`.`status` = 'pending')union all select 'withdrawal' AS `type`,`w`.`id` AS `id`,`w`.`user_id` AS `user_id`,`u`.`username` AS `username`,`w`.`amount` AS `amount`,`w`.`method` AS `method`,`w`.`created_at` AS `created_at` from (`withdrawals` `w` join `users` `u` on((`w`.`user_id` = `u`.`id`))) where (`w`.`status` = 'pending')  ;


DROP TABLE IF EXISTS `user_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`smegn`@`%` SQL SECURITY DEFINER VIEW `user_stats`  AS SELECT `u`.`id` AS `id`, `u`.`username` AS `username`, `u`.`first_name` AS `first_name`, `u`.`balance` AS `balance`, `u`.`bonus_balance` AS `bonus_balance`, count(distinct `gh`.`game_id`) AS `games_played`, sum((case when (`gh`.`result` = 'win') then `gh`.`win_amount` else 0 end)) AS `total_won`, count((case when (`gh`.`result` = 'win') then 1 end)) AS `wins_count`, count(`r`.`referred_id`) AS `referrals_count` FROM ((`users` `u` left join `game_history` `gh` on((`u`.`id` = `gh`.`user_id`))) left join `referrals` `r` on((`u`.`id` = `r`.`referrer_id`))) GROUP BY `u`.`id` ;

--

ALTER TABLE `approval_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin` (`admin_id`),
  ADD KEY `idx_target` (`target_type`,`target_id`);


ALTER TABLE `bingo_cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cartela_card` (`cartela_id`,`card_number`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `game_session_id` (`game_session_id`);


ALTER TABLE `cartela_card`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_cartela_number` (`cartela_number`);


ALTER TABLE `deposits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `drawn_numbers`
--
ALTER TABLE `drawn_numbers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_game_number` (`multiplayer_game_id`,`number`),
  ADD KEY `idx_drawn_at` (`drawn_at`),
  ADD KEY `drawn_by_user_id` (`drawn_by_user_id`);

--
-- Indexes for table `games`
--
ALTER TABLE `games`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_stake` (`stake`),
  ADD KEY `winner_id` (`winner_id`),
  ADD KEY `idx_game_code` (`game_code`),
  ADD KEY `idx_multiplayer` (`is_multiplayer`),
  ADD KEY `fk_host` (`host_id`);

--
-- Indexes for table `game_history`
--
ALTER TABLE `game_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_game` (`game_id`),
  ADD KEY `idx_result` (`result`),
  ADD KEY `cartela_id` (`cartela_id`);

--
-- Indexes for table `game_numbers`
--
ALTER TABLE `game_numbers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_game` (`game_id`),
  ADD KEY `idx_number` (`number`);

--
-- Indexes for table `game_number_calls`
--
ALTER TABLE `game_number_calls`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_session_calls` (`session_id`,`called_at`);

--
-- Indexes for table `game_players`
--
ALTER TABLE `game_players`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_unique_player` (`multiplayer_game_id`,`user_id`),
  ADD KEY `idx_game_user` (`multiplayer_game_id`,`user_id`),
  ADD KEY `idx_status` (`player_status`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `cartela_id` (`cartela_id`),
  ADD KEY `bingo_card_id` (`bingo_card_id`),
  ADD KEY `game_session_id` (`game_session_id`);

--
-- Indexes for table `game_players_queue`
--
ALTER TABLE `game_players_queue`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_session_user` (`session_id`,`user_id`),
  ADD KEY `bingo_card_id` (`bingo_card_id`),
  ADD KEY `idx_session_user` (`session_id`,`user_id`),
  ADD KEY `idx_session_status` (`session_id`,`status`),
  ADD KEY `fk_game_players_queue_user` (`user_id`);

--
-- Indexes for table `game_sessions`
--
ALTER TABLE `game_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_code` (`session_code`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_countdown_start` (`countdown_start_at`),
  ADD KEY `idx_winner` (`winner_user_id`),
  ADD KEY `idx_game_sessions_calling` (`status`,`is_calling_active`,`next_call_time`);

--
-- Indexes for table `global_lobby`
--
ALTER TABLE `global_lobby`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`);

--
-- Indexes for table `multiplayer_games`
--
ALTER TABLE `multiplayer_games`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `game_code` (`game_code`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_countdown_start` (`countdown_start`),
  ADD KEY `idx_game_code` (`game_code`),
  ADD KEY `winner_user_id` (`winner_user_id`),
  ADD KEY `idx_game_matching` (`status`,`created_at`,`max_players`,`current_players`);

--
-- Indexes for table `multiplayer_game_numbers`
--
ALTER TABLE `multiplayer_game_numbers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_game_numbers` (`game_id`,`called_at`),
  ADD KEY `called_by` (`called_by`);

--
-- Indexes for table `referrals`
--
ALTER TABLE `referrals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `referred_id` (`referred_id`),
  ADD KEY `idx_referrer` (`referrer_id`),
  ADD KEY `idx_referred` (`referred_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `telegram_id` (`telegram_id`),
  ADD UNIQUE KEY `referral_code` (`referral_code`),
  ADD KEY `referred_by` (`referred_by`),
  ADD KEY `idx_telegram_user_id` (`telegram_user_id`);

--
-- Indexes for table `withdrawals`
--
ALTER TABLE `withdrawals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `approved_by` (`approved_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bingo_cards`
--
ALTER TABLE `bingo_cards`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=316;

--
-- AUTO_INCREMENT for table `cartela_card`
--
ALTER TABLE `cartela_card`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=411;

--
-- AUTO_INCREMENT for table `drawn_numbers`
--
ALTER TABLE `drawn_numbers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `game_number_calls`
--
ALTER TABLE `game_number_calls`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=252;

--
-- AUTO_INCREMENT for table `game_players`
--
ALTER TABLE `game_players`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `game_players_queue`
--
ALTER TABLE `game_players_queue`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `game_sessions`
--
ALTER TABLE `game_sessions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `global_lobby`
--
ALTER TABLE `global_lobby`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `multiplayer_games`
--
ALTER TABLE `multiplayer_games`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `multiplayer_game_numbers`
--
ALTER TABLE `multiplayer_game_numbers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `approval_logs`
--
ALTER TABLE `approval_logs`
  ADD CONSTRAINT `approval_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bingo_cards`
--
ALTER TABLE `bingo_cards`
  ADD CONSTRAINT `bingo_cards_ibfk_1` FOREIGN KEY (`cartela_id`) REFERENCES `cartela_card` (`id`),
  ADD CONSTRAINT `bingo_cards_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `bingo_cards_ibfk_3` FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions` (`id`);

--
-- Constraints for table `deposits`
--
ALTER TABLE `deposits`
  ADD CONSTRAINT `deposits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `deposits_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `drawn_numbers`
--
ALTER TABLE `drawn_numbers`
  ADD CONSTRAINT `drawn_numbers_ibfk_1` FOREIGN KEY (`multiplayer_game_id`) REFERENCES `multiplayer_games` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `drawn_numbers_ibfk_2` FOREIGN KEY (`drawn_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `games`
--
ALTER TABLE `games`
  ADD CONSTRAINT `fk_host` FOREIGN KEY (`host_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `games_ibfk_1` FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `game_history`
--
ALTER TABLE `game_history`
  ADD CONSTRAINT `game_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_history_ibfk_2` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_history_ibfk_3` FOREIGN KEY (`cartela_id`) REFERENCES `cartelas` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `game_numbers`
--
ALTER TABLE `game_numbers`
  ADD CONSTRAINT `game_numbers_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `game_players`
--
ALTER TABLE `game_players`
  ADD CONSTRAINT `game_players_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_players_ibfk_3` FOREIGN KEY (`cartela_id`) REFERENCES `cartela_card` (`id`),
  ADD CONSTRAINT `game_players_ibfk_4` FOREIGN KEY (`bingo_card_id`) REFERENCES `bingo_cards` (`id`),
  ADD CONSTRAINT `game_players_ibfk_5` FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions` (`id`);

--
-- Constraints for table `game_players_queue`
--
ALTER TABLE `game_players_queue`
  ADD CONSTRAINT `fk_game_players_queue_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `game_players_queue_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_players_queue_ibfk_2` FOREIGN KEY (`bingo_card_id`) REFERENCES `bingo_cards` (`id`);

--
-- Constraints for table `global_lobby`
--
ALTER TABLE `global_lobby`
  ADD CONSTRAINT `global_lobby_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`id`);

--
-- Constraints for table `multiplayer_games`
--
ALTER TABLE `multiplayer_games`
  ADD CONSTRAINT `multiplayer_games_ibfk_1` FOREIGN KEY (`winner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `multiplayer_game_numbers`
--
ALTER TABLE `multiplayer_game_numbers`
  ADD CONSTRAINT `multiplayer_game_numbers_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `multiplayer_games` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `multiplayer_game_numbers_ibfk_2` FOREIGN KEY (`called_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `referrals`
--
ALTER TABLE `referrals`
  ADD CONSTRAINT `referrals_ibfk_1` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `referrals_ibfk_2` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`referred_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `withdrawals`
--
ALTER TABLE `withdrawals`
  ADD CONSTRAINT `withdrawals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `withdrawals_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

DELIMITER $$
--
-- Events
--
CREATE DEFINER=`smegn`@`%` EVENT `cleanup_multiplayer_games` ON SCHEDULE EVERY 1 HOUR STARTS '2026-02-09 22:01:29' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    -- Call the stored procedure
    CALL cleanup_old_games();
    
    -- Clean game_players for abandoned games
    DELETE FROM game_players 
    WHERE multiplayer_game_id IN (
        SELECT id FROM multiplayer_games 
        WHERE auto_cleanup = 1
    );
    
    -- Finally delete the games marked for cleanup
    DELETE FROM multiplayer_games 
    WHERE auto_cleanup = 1;
    
    -- Reset abandoned cartelas
    UPDATE cartela_card cc
    SET is_available = 1
    WHERE id IN (
        SELECT gp.cartela_id 
        FROM game_players gp
        LEFT JOIN multiplayer_games mg ON gp.multiplayer_game_id = mg.id
        WHERE mg.id IS NULL
    ) AND is_available = 0;
END$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
