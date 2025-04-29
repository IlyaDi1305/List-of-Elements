import axios from 'axios';

export const postBatchChanges = async (items: { id: string; position: number; selected: boolean }[]) => {
    try {
        await axios.post(`/batchSave`, { items });
    } catch (err) {
        console.error('Ошибка при batchSave:', err);
    }
};