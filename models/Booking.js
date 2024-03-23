const mongoose=require('mongoose');

const bookingschema= new mongoose.Schema({
   place: {type:mongoose.Schema.Types.ObjectId, required:true,ref:'Place'}, 
   user: {type:mongoose.Schema.Types.ObjectId,required:true},
   cin:{type:Date,required: true},
   cout:{type:Date,required: true},
   guests:{type:Number,required: true},
   name:{type:String,required: true},
   number:{type:Number,required: true},
   price:Number,
   email:{type:String,required: true},

})

const BookingModel=mongoose.model('Booking',bookingschema);

module.exports = BookingModel;