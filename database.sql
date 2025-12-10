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

INSERT INTO items ("itemName", "itemDesc", category) VALUES
    ('Porcelain Teacup', 'From her 50th anniversary trip to England.', 'keepsakes'),
    ('Quilt Blanket', 'Handmade with love by Grandma.', 'keepsakes'),
    ('Photo Album', 'Family memories through the years.', 'books'),
    ('Silver Necklace', 'Gift from Grandpa on their 40th anniversary.', 'jewelry');