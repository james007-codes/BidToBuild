import mongoose from "mongoose";

// Atomic sequence generator used for human-friendly ticket numbers (MT-1001, MT-1002...)
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 1000 },
});

const Counter = mongoose.model("Counter", counterSchema);

export async function nextSequence(name) {
    const counter = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return counter.seq;
}

export default Counter;
