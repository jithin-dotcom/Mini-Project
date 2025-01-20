const mongoose = require("mongoose");
const {Schema} = mongoose;


const reviewSchema = new Schema({
   
    reviewMssg : {
       type : String,
       required : true
    },
    rating : {
        type : Number,
        required :true
    },
    userId : {
        type : Schema.Types.ObjectId,
        required : true
    },
    productId : {
        type : Schema.Types.ObjectId,
        required : true
    },
    createdOn : {
        type : Date,
        default : Date.now,
        required : true
    }

})


const Review = mongoose.model("Review",reviewSchema);
module.exports = Review;