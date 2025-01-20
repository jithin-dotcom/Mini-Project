const mongoose = require("mongoose");
const {Schema} = mongoose;


const offerSchema = new Schema({
    discount : {
        type : Number,
        required : true
    },
    expiry : {
        type : Date,
        required : true
    },
    categoryApplicable : [{
        type : Schema.Types.ObjectId,
        required : true
    }],
    createdOn : {
        type : Date,
        required : true
    },
    updatedOn : {
        type : Date,
        required : true
    }, 
    productsApplicable : [{
        type : Schema.Types.ObjectId,
        required : true
    }]

})


const Offer = mongoose.model("Offer",offerSchema);
module.exports = Offer;