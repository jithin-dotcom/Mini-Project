const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const PORT = process.env.PORT;
const db = require("./config/db");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const User = require("./models/userSchema");


db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Session management with MongoDB
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions"
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 3 days
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.set('cache-control', 'no-store');
    next();
});

// View engine setup
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, "public")));

app.get('/index', (req, res) => {
    res.render('index');
});








// User and admin router setup
app.use("/", userRouter);
app.use("/admin", adminRouter);

















app.listen(PORT, () => {
    console.log(`server is running at port : ${PORT}...`);
});

module.exports = app;
















//session stored locally


// const express = require("express");
// const app = express();
// const path  = require("path");
// const env = require("dotenv").config();
// const session = require("express-session");
// const passport = require("./config/passport");
// const PORT = process.env.PORT;
// const db = require("./config/db");
// const userRouter = require("./routes/userRouter");
// const adminRouter = require("./routes/adminRouter");
                                                  
// db();

// app.use(express.json());
// app.use(express.urlencoded({extended:true}));


// //session management
// app.use(session({
//     secret:process.env.SESSION_SECRET,
//     resave:false,
//     saveUninitialized:true,
//     cookie:{
//         secure:false,
//         httpOnly:true,
//         maxAge:72*60*60*1000
//     }
// }))

// app.use(passport.initialize());
// app.use(passport.session());



// app.use((req,res,next) => {
//     res.set('cache-control','no-store');
//     next();
// })



// // view engine setup
// app.set("view engine","ejs");
// app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
// app.use(express.static(path.join(__dirname,"public")));


// //user and admin router setup
// app.use("/",userRouter);
// app.use("/admin",adminRouter);




// app.listen(PORT,() => {
//     console.log(`server is running at port : ${PORT}...`);
// });
// module.exports = app;





