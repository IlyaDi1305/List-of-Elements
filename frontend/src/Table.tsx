import React, { useState, useEffect, useRef } from 'react';
import { postReorder, postSelectionChange } from './api';
import InfiniteScroll from 'react-infinite-scroll-component';

interface Item {
    id: string;
    name: string;
    position: number;
    selected: boolean;
}

let DraggingId: string | null = null;

const Table: React.FC = () => {
    const [items, setItems] = useState<Map<string, Item>>(new Map());
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [isBooting, setIsBooting] = useState(true);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);

    const controllerRef = useRef<AbortController | null>(null);

    const fetchItems = async (reset = false, customSearch?: string) => {
        if (isFetching) return;
        setIsFetching(true);
        if (reset) setIsLoadingSearch(true);

        if (controllerRef.current) controllerRef.current.abort();
        controllerRef.current = new AbortController();

        const currentOffset = reset ? 0 : offset;
        const searchQuery = customSearch ?? search;

        try {
            const res = await fetch(`/items?search=${encodeURIComponent(searchQuery)}&offset=${currentOffset}&limit=20`, {
                signal: controllerRef.current.signal
            });

            const data = await res.json();
            const itemsMap = new Map<string, Item>();
            data.items.forEach((item: Item) => {
                itemsMap.set(item.id, item);
            });

            if (reset) {
                setItems(itemsMap);
                setOffset(data.items.length);
            } else {
                setItems(prev => new Map([...prev, ...itemsMap]));
                setOffset(prev => prev + data.items.length);
            }

            setHasMore(currentOffset + data.items.length < data.total);
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                console.error('Ошибка при получении данных:', e);
            }
        }

        setIsFetching(false);
        setIsLoadingSearch(false);
    };

    useEffect(() => {
        void fetchItems(true);
    }, []);

    useEffect(() => {
        const bootTimeout = setTimeout(() => {
            setIsBooting(false);
        }, 500);
        return () => clearTimeout(bootTimeout);
    }, []);

    const handleSelect = async (id: string) => {
        const updated = new Map(items);
        const item = updated.get(id);
        if (item) {
            item.selected = !item.selected;
            updated.set(id, item);
            setItems(new Map(updated));
            await postSelectionChange(item);
        }
    };

    const onDragStart = (_: React.DragEvent, id: string) => {
        DraggingId = id;
    };

    const onDrop = (_: React.DragEvent, targetId: string) => {
        if (!DraggingId || DraggingId === targetId) return;

        const updated = new Map(items);
        const draggedItem = updated.get(DraggingId);
        const targetItem = updated.get(targetId);
        if (!draggedItem || !targetItem) return;

        const allItems = Array.from(updated.values()).sort((a, b) => a.position - b.position);

        const draggedIndex = allItems.findIndex(i => i.id === DraggingId);
        const dragged = allItems.splice(draggedIndex, 1)[0];
        const targetIndex = allItems.findIndex(i => i.id === targetId);
        allItems.splice(targetIndex, 0, dragged);

        allItems.forEach((item, idx) => {
            item.position = idx + 1;
            updated.set(item.id, item);
        });

        setItems(new Map(updated));
        void postReorder(DraggingId, targetId);

        DraggingId = null;
    };

    const onDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setSearch(inputValue);
            setOffset(0);
            setItems(new Map());
            void fetchItems(true, inputValue);
        }
    };

    const filteredItems = Array.from(items.values())
        .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.position - b.position);

    if (isBooting || isLoadingSearch) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3498db',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        );
    }

    return (
        <div id="scrollableDiv">
            <div className="search-bar" style={{ display: 'flex', gap: '10px', paddingLeft: '20px' }}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={inputValue}
                    onChange={handleSearchInput}
                    onKeyDown={handleSearchKeyDown}
                    style={{ padding: '8px', width: '250px' }}
                />
                <button
                    onClick={() => {
                        setSearch(inputValue);
                        setOffset(0);
                        setItems(new Map());
                        void fetchItems(true, inputValue);
                    }}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#3498db',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    OK
                </button>
            </div>

            <InfiniteScroll
                dataLength={filteredItems.length}
                next={() => fetchItems(false, search)}
                hasMore={hasMore}
                scrollableTarget="scrollableDiv"
                loader={<div className="loader">↓ Scroll down to load more</div>}
                style={{ paddingBottom: '100px' }}
            >
                <table className="table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Select</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredItems.map((item) => (
                        <tr
                            key={item.id}
                            className="row"
                            draggable
                            onDragStart={(e) => onDragStart(e, item.id)}
                            onDrop={(e) => onDrop(e, item.id)}
                            onDragOver={onDragOver}
                        >
                            <td>{item.name}</td>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => handleSelect(item.id)}
                                />
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </InfiniteScroll>
        </div>
    );
};

export default Table;