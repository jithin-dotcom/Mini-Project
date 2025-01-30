const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");





const loadCoupon = async (req, res) => {
   try {
     // Get the page number from the query parameters (default to 1 if not provided)
     const page = parseInt(req.query.page) || 1;
     const limit = 4; // Number of coupons per page
     const skip = (page - 1) * limit;
 
     // Fetch coupons with pagination
     const findCoupons = await Coupon.find({})
       .skip(skip)
       .limit(limit);
 
     // Get the total number of coupons to calculate total pages
     const totalCoupons = await Coupon.countDocuments();
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
 
     // Convert startDate and endDate to Date objects
     const startDateObj = new Date(startDate + "T00:00:00");
     const endDateObj = new Date(endDate + "T00:00:00");
 
     // Validate that startDate is less than or equal to endDate
     if (startDateObj > endDateObj) {
       return res.status(400).json({ message: "Start Date must be less than or equal to End Date." });
     }
 
     // Check if a coupon with the same name (case-insensitive) already exists
     const existingCoupon = await Coupon.findOne({
       name: { $regex: new RegExp(`^${couponName}$`, "i") },
     });
 
     if (existingCoupon) {
       // If a coupon already exists, return an error response
       return res.status(400).json({ message: "Coupon name already exists." });
     }
 
     // Create new coupon
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
 





// const createCoupon = async (req,res) => {

//    try {
    
//       const data = {
//          couponName : req.body.couponName,
//          startDate : new Date(req.body.startDate + "T00:00:00"),
//          endDate : new Date(req.body.endDate + "T00:00:00"),
//          offerPrice : parseInt(req.body.offerPrice),
//          minimumPrice : parseInt(req.body.minimumPrice),
//       }
       
//       const newCoupon = new Coupon({
//          name : data.couponName,
//          createdOn : data.startDate,
//          expireOn : data.endDate,
//          offerPrice : data.offerPrice,
//          minimumPrice : data.minimumPrice,
//       });
//       await newCoupon.save();
//       return res.redirect("/admin/coupon");

//    } catch (error) {
//       console.error('Error creating coupon:', error);
//       res.redirect("/pageerror");
//    }


// }



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