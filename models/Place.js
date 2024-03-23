const mongoose= require('mongoose')

const placeSchema= new mongoose.Schema({
    owner:{type:mongoose.Schema.Types.ObjectId, ref:'User'},
    title: String,
    address:String,
    photos:[String],
    description:String,
    perks:[String],
    extra:String,
    cin:Number,
    cout:Number,
    guests:Number,
    price:Number
})

const PlaceModel=mongoose.model('Place',placeSchema);

module.exports= PlaceModel;