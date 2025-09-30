import mongoose from "mongoose";
import User from "../../models/userSchema.js";
import Coupon from "../../models/couponSchema.js";





const loadCoupon = async (req, res) => {
   try {
     const page = parseInt(req.query.page) || 1;
     const limit = 4; 
     const skip = (page - 1) * limit;
     const [findCoupons, totalCoupons] = await Promise.all([
      Coupon.find({})
          .sort({createdOn: -1})
          .skip(skip)
          .limit(limit),
      Coupon.countDocuments()
    ]);
  
     const totalPages = Math.ceil(totalCoupons / limit);
     return res.render("coupon", {
       coupons: findCoupons,
       currentPage: page,
       totalPages: totalPages,
       search: "",
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
      return res.status(400).json({ status: false, message: "Start Date must be less than or equal to End Date." });
    }
    const existingCoupon = await Coupon.findOne({
      name: { $regex: new RegExp(`^${couponName}$`, "i") },
    });

    if (existingCoupon) {
      return res.status(400).json({ status: false, message: "Coupon name already exists." });
    }
    const newCoupon = new Coupon({
      name: couponName,
      createdOn: startDateObj,
      expireOn: endDateObj,
      offerPrice: parseInt(offerPrice),
      minimumPrice: parseInt(minimumPrice),
    });
    await newCoupon.save();
    return res.json({ status: true, message: "Coupon created successfully" });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};
 



 
 const getCouponsData = async (req, res) => {
   try {
     const page = parseInt(req.query.page) || 1;
     const limit = 4;
     const skip = (page - 1) * limit;
 
     const [coupons, totalCoupons] = await Promise.all([
       Coupon.find({})
         .sort({ createdOn: -1 })
         .skip(skip)
         .limit(limit),
       Coupon.countDocuments()
     ]);
 
     const totalPages = Math.ceil(totalCoupons / limit);
     res.json({
       status: true,
       coupons: coupons,
       currentPage: page,
       totalPages: totalPages
     });
   } catch (error) {
     console.error("Error fetching coupons for AJAX:", error);
     res.status(500).json({ status: false, message: "Error fetching coupons" });
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




const deleteCoupon = async (req, res) => {
  try {
    const id = req.query.id;
    const result = await Coupon.deleteOne({ _id: id });
    if (result.deletedCount > 0) {
      res.json({ status: true, message: "Coupon deleted successfully" });
    } else {
      res.status(404).json({ status: false, message: "Coupon not found" });
    }
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ status: false, message: "Failed to delete coupon" });
  }
};





const couponController ={
  loadCoupon,
  createCoupon,
  editCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponsData
};

export default couponController;