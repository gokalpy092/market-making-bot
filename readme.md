Requirements
-	nodeJS installed: https://nodejs.org/it/download/
-	mysql installed (XAMPP is fine if you want to have phpMyAdmin UI to interact with the db)

Package dependency
Run the following command from cmd: npm install --save ethers

Database configuration

#1 Option
Run the following SQL command:
CREATE TABLE accounts (
public_key varchar(255),
private_key varchar(255),
ID int NOT NULL AUTO_INCREMENT,
PRIMARY KEY (ID)
);

Start the code
1.	Open cmd prompt
2.	Run the following command: node bot.js
