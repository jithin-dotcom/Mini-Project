const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");





const loadCoupon = async (req, res) => {
   try {
     const page = parseInt(req.query.page) || 1;
     const limit = 4; 
     const skip = (page - 1) * limit;
     const [findCoupons, totalCoupons] = await Promise.all([
      Coupon.find({})
          .skip(skip)
          .limit(limit),
      Coupon.countDocuments()
    ]);
  
     const totalPages = Math.ceil(totalCoupons / limit);
     return res.render("coupon", {
       coupons: findCoupons,
       currentPage: page,
       totalPages: totalPages,
     });
   } catch (error) {
     console.error("Error loading coupons:", error);
     return res.redirect("/pageerror");
   }
 };
 




const createCoupon = async (req, res) => {
   try {
     const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;
     const startDateObj = new Date(startDate + "T00:00:00");
     const endDateObj = new Date(endDate + "T00:00:00");
     if (startDateObj > endDateObj) {
       return res.status(400).json({ message: "Start Date must be less than or equal to End Date." });
     }
     const existingCoupon = await Coupon.findOne({
       name: { $regex: new RegExp(`^${couponName}$`, "i") },
     });
 
     if (existingCoupon) {
       return res.status(400).json({ message: "Coupon name already exists." });
     }
     const newCoupon = new Coupon({
       name: couponName,
       createdOn: startDateObj,
       expireOn: endDateObj,
       offerPrice: parseInt(offerPrice),
       minimumPrice: parseInt(minimumPrice),
     });
     await newCoupon.save();
     return res.redirect("/admin/coupon");
   } catch (error) {
     console.error("Error creating coupon:", error);
     res.redirect("/pageerror");
   }
 };
 



const editCoupon = async (req,res) => {

     try {
        const id = req.query.id;
        const findCoupon = await Coupon.findOne({_id:id});
        res.render("edit-coupon",{
            findCoupon:findCoupon,
        })

     } catch (error) {
        console.error("error occured editCoupon : ",error);
        res.redirect("/pageerror");
     }

}

 

const updateCoupon = async (req,res) => {

    try {
        
       const  couponId = req.body.couponId;
       const oid = new mongoose.Types.ObjectId(couponId);
       const selectedCoupon = await Coupon.findOne({_id:oid});
       if(selectedCoupon) {
          const startDate = new Date(req.body.startDate);
          const endDate = new Date(req.body.endDate);
          const updatedCoupon = await Coupon.updateOne(
             {_id:oid},
             {
                $set : {
                    name : req.body.couponName,
                    createdOn : startDate,
                    expireOn : endDate,
                    offerPrice : parseInt(req.body.offerPrice),
                    minimumPrice :parseInt(req.body.minimumPrice),
                },

             },{new:true}  

          );
          if(updatedCoupon!==null){
            res.send("Coupon updated successfully");
          }else{
            res.status(500).send("Coupon update failed");
          }
       }

    } catch (error) {
        console.error("error occured while updating coupon : ",error);
        res.redirect("/pageerror")
    }

}



const deleteCoupon = async(req,res) => {

   try {
    
      const id = req.query.id;
      await Coupon.deleteOne({_id:id});
      res.status(200).send({success:true,message:"Coupon deleted successfully"});

   } catch (error) {
     
      console.error("Error deleting coupon : ",error);
      res.status(500).send({success:false,message:"Failed to delete coupon"});

   }

}








module.exports = {
    loadCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon,
}























































































































































































 //  const findCoupons = await Coupon.find({})
    //    .skip(skip)
    //    .limit(limit);
    //  const totalCoupons = await Coupon.countDocuments();