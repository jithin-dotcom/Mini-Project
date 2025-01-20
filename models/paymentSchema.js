const mongoose = require ("mongoose");
const {Schema} = mongoose;

const paymentSchema = new Schema({
   orderId : {
      type : Schema.Types.ObjectId,
      ref : "Order",
      required : true
   },
   transactionId : {
       type : String,
       require : true, 
   },
   status : {
       type : String,
       required : true      
   },
   method : {
       type :String,
       required :true
   },
   userId : {
       type : Schema.Types.ObjectId,
       ref : "User",
       required : true
   },
   amount : {
       type : Number,
       required : true
   },
   createdOn : {
       type : Date,
       default : Date.now,
       required : true
   }

})


const Payment = mongoose.model("Payment",paymentSchema);
module.exports = Payment;