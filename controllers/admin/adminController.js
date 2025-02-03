const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror = async(req,res)=>{
    res.render("admin-error");
}


const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin"); //new 
        // return res.redirect("/admin/dashboard");
    }
    res.render("admin-login",{message:null})
}

const login = async(req,res)=>{
    try{
       const {email,password} = req.body;

        // Find an admin user with the given email (ensures user is an admin by checking `isAdmin: true`)
       const admin = await User.findOne({email,isAdmin:true});

        // If an admin user is found, proceed to validate the password
       if(admin){
        const passwordMatch = bcrypt.compare(password,admin.password);

      // If the password matches, set a session flag for the admin and redirect to the admin dashboard
        if(passwordMatch){
            req.session.admin = true;
            return res.redirect("/admin");
        }else{
            return res.redirect("/login");
        }
       }


    }catch(error){
        console.log("login error",error);
        return res.redirect("/pageerror");
    }
}





const logout = async (req, res) => {
    try {
        req.session.admin = null; // Clear only the admin session  new
        res.redirect("/admin/login");
    } catch (error) {
        console.log("Unexpected error during logout", error);
        res.redirect("/pageerror");
    }
};






//logout latest

// const logout = async(req,res)=>{
//     try{
       
//         req.session.destroy(err=>{
//             if(err){
//                 console.log("Error destroying session",err);
//                 return res.redirect("/pageerror");
//             }
//             res.redirect("/admin/login");
//         })
//     }catch(error){
//        console.log("unexpected error during logout",error);
//        res.redirect("/pageerror");
//     }
// }


module.exports = {
    loadLogin,
    login,
    pageerror,
    logout
}