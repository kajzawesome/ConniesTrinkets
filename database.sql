DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    "userID" integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    username varchar(30) NOT NULL UNIQUE,
    password varchar(30) NOT NULL,
    "userFirstName" varchar(30) NOT NULL,
    "userLastName" varchar(30) NOT NULL,
    role varchar(1) NOT NULL,
    PRIMARY KEY ("userID")
);

INSERT INTO users (username, password, "userFirstName", "userLastName", role)
VALUES 
    ('manager1', 'managerpass1', 'Manager', 'One', 'M'),
    ('manager2', 'managerpass2', 'Manager', 'Two',  'M');

CREATE TABLE items (
    "itemID" integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    "userID" integer REFERENCES users("userID") ON DELETE SET NULL,
    "itemName" varchar(60) NOT NULL,
    "itemDesc" text NOT NULL,
    category varchar(30) NOT NULL,
    "itemImagePath" varchar(500),
    "itemDateClaimed" date,
    PRIMARY KEY ("itemID")
);

INSERT INTO items ("itemName", "itemDesc", category, "itemImagePath") VALUES
    ('Porcelain Teacup', 'From her 50th anniversary trip to England.', 'keepsakes', '/uploads/1765346675124-398974655.webp'),
    ('Quilt Blanket', 'Handmade with love by Grandma.', 'keepsakes', '/uploads/1765346619967-569269074.jpg'),
    ('Photo Album', 'Family memories through the years.', 'books', '/uploads/1765346576414-792317014.jpg'),
    ('Silver Necklace', 'Gift from Grandpa on their 40th anniversary.', 'jewelry', '/uploads/1765346529707-657069166.jpg');