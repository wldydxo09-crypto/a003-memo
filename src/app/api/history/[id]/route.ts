import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const updates = await request.json();

        // Remove fields that shouldn't be updated directly via this generic route if strictly needed,
        // but for now we trust the client (authenticated users only in real app)
        const { _id, userId, ...updateFields } = updates;

        const db = await getDatabase();
        const collection = db.collection('history');

        // Try to update by 'id' (string) first (legacy/migrated), then by '_id' (ObjectId)
        let query: any = { id: id };

        // Check if we need to use ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/) && id.length < 20) {
            // Custom ID, keep as string
        } else if (ObjectId.isValid(id)) {
            // It might be an ObjectId, but query by both OR logic or check if it exists
            // Since migrated items have string 'id', let's stick to 'id' field first. 
            // In our migration, we kept 'id' field.
            // If new item created by MongoDB, it might not have 'id' field if we didn't add it explicitly (we did in POST route sort of? no we returned insertedId)
            // Wait, POST route above: `result.insertedId`. We didn't save `id: string` in DB for new items.
            // So new items only have `_id`. Migrated items have `id` and `_id`.

            // Strategy: Try to find by `id` (string). If not found, try `_id` (ObjectId).
        }

        // Simpler strategy for update:
        // Attempt to update where `id` equals param OR `_id` equals ObjectId(param)

        const filter = {
            $or: [
                { id: id },
                ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
            ]
        };

        const result = await collection.updateOne(
            filter,
            {
                $set: {
                    ...updateFields,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Item updated' });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = await getDatabase();
        const collection = db.collection('history');

        const filter = {
            $or: [
                { id: id },
                ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
            ]
        };

        const result = await collection.deleteOne(filter);

        if (result.deletedCount === 0) {
            return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Item deleted' });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
