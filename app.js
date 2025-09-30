
import express from "express";
import path from "path";
import dotenv from "dotenv";
dotenv.config(); 
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname } from "path";


import passport from "./config/passport.js";
import db from "./config/db.js";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import User from "./models/userSchema.js";
import setItemCounts from "./middlewares/setItemCounts.js";

const app = express();


db();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: false,
    useUnifiedTopology: false
});


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions"
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.set('cache-control', 'no-store');
    next();
});


app.use(setItemCounts);



app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, "public")));

app.get('/index', (req, res) => {
    res.render('index');
});


app.use("/", userRouter);
app.use("/admin", adminRouter);


app.listen(PORT, () => {
    console.log(`server is running at port : ${PORT}...`);
});



export default app;