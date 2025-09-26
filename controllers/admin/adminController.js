const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror = async(req,res)=>{
    res.render("admin-error");
}


const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin"); 
    }
    res.render("admin-login",{message:null})
}


const login = async(req,res)=>{
    try{
       const {email,password} = req.body;
       const admin = await User.findOne({email,isAdmin:true});
      
       if(!admin){
          return res.render("admin-login",{message:"Invalid Credentials"});
       }
       if(admin){
        const passwordMatch = bcrypt.compare(password,admin.password);
        if(passwordMatch){
            req.session.admin = true;
            return res.redirect("/admin");
        }else{
            return res.render("admin-login", { message: "Invalid Credentials" });
        }
       }
    }catch(error){
        console.log("login error",error);
        return res.render("admin-login", { message: "An error occurred. Please try again." });
    }
}


const logout = async (req, res) => {
    try {
        req.session.admin = null; 
        res.redirect("/admin/login");
    } catch (error) {
        console.log("Unexpected error during logout", error);
        res.render("admin-login", { message: "An error occurred during logout. Please try again." })
    }
};






module.exports = {
    loadLogin,
    login,
    pageerror,
    logout,
    
}