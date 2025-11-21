CREATE TABLE IF NOT EXISTS users (
    "userID" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 ),
    username character varying(30) NOT NULL,
    password character varying(30) NOT NULL,
    "userFirstName" character varying(30) NOT NULL,
    "userLastName" character varying(30) NOT NULL,
    PRIMARY KEY ("userID")
);

INSERT INTO users (
username, password, "userFirstName", "userLastName")
VALUES (
    'manager1'::character varying,
    'managerpass1'::character varying,
    'Manager'::character varying,
    'One'::character varying);

INSERT INTO users (
username, password, "userFirstName", "userLastName")
VALUES (
    'manager2'::character varying,
    'managerpass2'::character varying,
    'Manager'::character varying,
    'Two'::character varying);

CREATE TABLE IF NOT EXISTS items (
    "itemID" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 ),
    "userID" integer,
    "itemName" character varying(60) NOT NULL,
    "itemDesc" text NOT NULL,
    "category" character varying(30) NOT NULL,
    "itemImagePath" character varying(500),
    "itemDateClaimed" date,
    PRIMARY KEY ("itemID")
);

INSERT INTO items (
"itemName", "itemDesc", category)
VALUES (
    'Porcelain Teacup'::character varying,
    'From her 50th anniversary trip to England.'::text,
    'keepsakes'::character varying);

INSERT INTO items (
"itemName", "itemDesc", category)
VALUES (
    'Quilt Blanket'::character varying,
    'Handmade with love by Grandma.'::text,
    'keepsakes'::character varying);

INSERT INTO items (
"itemName", "itemDesc", category)
VALUES (
    'Photo Album'::character varying,
    'Family memories through the years.'::text,
    'books'::character varying);

INSERT INTO items (
"itemName", "itemDesc", category)
VALUES (
    'Silver Necklace'::character varying,
    'Gift from Grandpa on their 40th anniversary.'::text,
    'jewelry'::character varying);