const mongoose = require("mongoose");
const {Schema} = mongoose;


const sizeSchema = new Schema({
    
    product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    size : {
        type : String,
        required : true
    },
    quantity : {
        type : Number,
        required : true
    }
})



const Size = mongoose.model("Size",sizeSchema);
module.exports = Size;