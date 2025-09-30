
import mongoose, { Schema } from "mongoose";

const wishlistSchema = new Schema({
   
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        price: {
            type: Number,
            required: true
        },
        size: {
            type: String,
            required: true
        },
        
        name:{
            type:String,
            
        },
        maxStock:{
            type:Number,
        }
    }]
}, {
    timestamps: true  

})


const Wishlist = mongoose.model("Wishlist",wishlistSchema);
export default Wishlist;























