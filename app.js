import "dotenv/config";
import express from 'express';
import mongoose from 'mongoose';
import encrypt from "mongoose-encryption";

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

const port = process.env.PORT;
const username = process.env.DATABASE_USERNAME;
const password = process.env.DATABASE_PASSWORD;

const secret = process.env.LONG_SECRET_KEY;

const uri = `mongodb+srv://${username}:${password}@cluster0.qrml7jb.mongodb.net/secretsDB?retryWrites=true&w=majority&appName=Cluster0`;

await mongoose.connect(uri);

const userSchema = new mongoose.Schema({
    email : String,
    password: String,
});

userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
        const user = await User.findOne({email: username});
        if(user) {
            if(user.password === password) {
                res.render("secrets");
            }
        }
        
    } catch (error) {
        console.log(error);
    }
    
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });
    try {
        await user.save();
        res.render("secrets");
    } catch (error) {
        console.log(error);
    }
    
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
