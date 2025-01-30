const mongoose = require("mongoose");
const {Schema} = mongoose;
// const {v4:uuidv4} = require("uuid");
const Size = require("./sizeSchema");

// Custom function to generate a 6-digit UUID
const generate6DigitUUID = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };


const orderSchema = new Schema({
    // orderId : {
    //     type : String,
    //     default : ()=>uuidv4(),
    //     unique : true
    // },
    orderId: {
        type: String,
        default: generate6DigitUUID,
        unique: true
      },
    orderedItems : [{
       
        product : {
            type : Schema.Types.ObjectId,
            ref : "Product",
            required : true
        },
        quantity : {
            type : Number,
            required : true
        },
        price : {
            type : Number,
            default : 0
        },
        size : {
            type : String,
            required : true
        },
        name : {
            type : String,
        
        },
        image: {
            type: String, // URL for the product image
            // required: true
        }
    }],
    totalPrice : {
        type : Number,
        required : true
    },
    couponDeduction : {
        type : Number,
    },
    discount : {
        type : Number,
        default : 0
    },
    finalAmount : {
        type : Number,
        // required : true
    },
    paymentMethod : {
        type : String,
        // required : true,
    },
    paymentStatus : {
        type : String,
        default : 'completed',
    },

    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        // required : true
    },

    address: {
        type: Schema.Types.ObjectId,
        ref: "Address", // Reference to the Address collection
        required: true
    },

    
    invoiceDate : {
        type : Date
    },
    status : {
        type : String,
        required : true,
        enum : ["Pending","Shipped","Delivered","Cancelled","Return Request","Returned"],
        default: "Pending"
    },
    cancellationReason: {
        type: String,
        default: "none"
    },
    createdOn : {
        type : Date,
        default : Date.now,
        required : true
    },
    couponApplied : {
        type : Boolean,
        default : false
    }
})

const Order = mongoose.model("Order",orderSchema);
module.exports = Order;