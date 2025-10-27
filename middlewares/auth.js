import { MESSAGES } from "../constants/messages.js";
import { STATUS_CODES } from "../constants/statusCodes.js";
import User from "../models/userSchema.js";

const userAuth = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);

            if (user && !user.isBlocked) {
                next(); 
            } else {
                req.session.destroy(err => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }

                    return res.render("login",{message:"User is blocked by admin"}); 

                });
            }
        } else {
            res.redirect("/login"); 
        }
    } catch (error) {
        console.error("Error in user auth middleware:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};




const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login");
        }
    })
    .catch(error=>{
        console.log("Error in adminauth middleware",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    })
}


export {
    userAuth,
    adminAuth,
};