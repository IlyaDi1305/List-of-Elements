import axios from 'axios';

const API_URL = 'http://localhost:3001';

export const getItems = async (search = '', offset = 0, limit = 20) => {
    const response = await axios.get(`${API_URL}/items`, {
        params: {search, offset, limit},
    });
    return response.data;
};

export const selectItem = async (id: string, selected: boolean) => {
    return await fetch(`${API_URL}/select`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id, selected})
    });
};

export const postOrder = async ({id1, id2}: { id1: number, id2: number }) => {
    await axios.post(`${API_URL}/sort`, {id1, id2});
};
