import "dotenv/config";
import express from 'express';
import mongoose from 'mongoose';
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";


const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(session({
    secret: process.env.LONG_SECRET_KEY,
    resave: false,
    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());

const port = process.env.PORT;
const username = process.env.DATABASE_USERNAME;
const password = process.env.DATABASE_PASSWORD;


const uri = `mongodb+srv://${username}:${password}@cluster0.qrml7jb.mongodb.net/secretsDB?retryWrites=true&w=majority&appName=Cluster0`;

await mongoose.connect(uri);

const userSchema = new mongoose.Schema({
    email : String,
    password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});


app.get("/secrets", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
})

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if(err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
})

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, (err, account) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                // if they are successfully authenticated
                res.redirect("/secrets");
            });
        }
    })    
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const user = new User({
        username: username,
        password: password
    })

    req.login(user, (err) => {
        if(err) {
            console.log(err);
        }else {
            // if user is successfully logged in
            passport.authenticate("local")(req, res, () => {
                // if they are successfully authenticated
                res.redirect("/secrets");
            });
        }
    })
    
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
