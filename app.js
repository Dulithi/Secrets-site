import "dotenv/config";
import express, { request } from 'express';
import mongoose from 'mongoose';
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import findOrCreate from "mongoose-findorcreate";


const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(session({
    secret: process.env.LONG_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: process.env.NODE_ENV === 'production' }
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
    googleId: String // for google authentication
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  (accessToken, refreshToken, profile, cb) => {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",  
    passport.authenticate('google', { failureRedirect: '/login'}),
    function(req, res) {
    // Successful authentication, redirect Secrets.
    res.redirect('/secrets');
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});


app.get("/secrets", (req, res) => {
    console.log(req.isAuthenticated());
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
