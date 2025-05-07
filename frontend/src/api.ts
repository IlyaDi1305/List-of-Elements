import axios from 'axios';

export const postReorder = async (draggedId: string, targetId: string) => {
    try {
        await axios.post('/reorder', { draggedId, targetId });
    } catch (err) {
        console.error('Ошибка при reorder:', err);
    }
};

export const postSelectionChange = async (item: { id: string; selected: boolean }) => {
    try {
        await axios.post('/select', { id: item.id, selected: item.selected });
    } catch (err) {
        console.error('Ошибка при выборе:', err);
    }
};
