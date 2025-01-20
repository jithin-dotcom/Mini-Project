const mongoose = require("mongoose");
const {Schema} = mongoose;


const productSchema = new Schema({
    productName : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    brand : {
        type : String,
        required : true
    },
    category : {
        type : Schema.Types.ObjectId,
        ref : "Category", 
        required : true
    },
     regularPrice : {
        type : Number,
        required : true
     },
     salePrice : {
         type : Number,
         required : true
     },
     productOffer : {
        type : Number,
        default : 0,
     },
    //  quantity : {
    //     type : Number,
    //     default : true
    //  },

    size: {
        type: Map,
        of: Number, // Key-value pair where key is the size, and value is the quantity
        required: true,
    },

    // sizeOptions:[{
    //     type : Schema.Types.ObjectId,
    //     ref : "Size",
    //     required : true
    // }],


    // size: {
    //     type: Object,  // Changed from Map to Object
    //     required: true,
    //     default: {} // Default as an empty object
    // },
     color : {
        type : String,
        required : true
     },
      productImage : {
        type : [String],
        required : true
      },
      isBlocked : {
        type : Boolean,
        default : false
      },
      status : {
        type : String,
        enum : ["Available","out of stock","Discontinued"],
        required : true,
        default : "Available"
    }

},{timestamps:true});







const Product  = mongoose.model("Product",productSchema);
module.exports = Product;