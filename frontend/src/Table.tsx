import React, {useState, useEffect, useCallback, useRef} from 'react';
import {postBatchChanges} from './api';
import InfiniteScroll from 'react-infinite-scroll-component';

interface Item {
    id: string;
    name: string;
    position: number;
    selected: boolean;
}

let DraggingId: string | null = null;
const pendingItems: Map<string, Item> = new Map();

const Table: React.FC = () => {
    const [items, setItems] = useState<Map<string, Item>>(new Map());
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const controllerRef = useRef<AbortController | null>(null);

    const fetchItems = useCallback(async (reset = false) => {
        if (isFetching) return;
        setIsFetching(true);

        if (controllerRef.current) controllerRef.current.abort();
        controllerRef.current = new AbortController();

        const currentOffset = reset ? 0 : offset;

        try {
            const res = await fetch(`/items?search=${encodeURIComponent(search)}&offset=${currentOffset}&limit=20`, {
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

            setHasMore(data.items.length > 0);
        } catch (e: unknown) {
            if (e instanceof Error && e.name !== 'AbortError') {
                console.error('Ошибка при получении данных:', e);
            }
        }

        setIsFetching(false);
    }, [search, offset, isFetching]);


    useEffect(() => {
        const cached = localStorage.getItem('cachedItems');
        if (cached) {
            try {
                const parsed = new Map<string, Item>(JSON.parse(cached));
                setItems(parsed);
                setOffset(parsed.size);
            } catch (e) {
                console.error('Ошибка чтения кэша:', e);
            }
        }
    }, []);

// debounce-поиск
    useEffect(() => {
        const delay = setTimeout(() => {
            void fetchItems(true);
        }, 300);

        return () => clearTimeout(delay);
    }, [fetchItems, search]);

// авто-сохранение пакетом
    useEffect(() => {
        const interval = setInterval(() => {
            if (pendingItems.size > 0) {
                const batch = Array.from(pendingItems.values());
                void postBatchChanges(batch);
                pendingItems.clear();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleSelect = (id: string) => {
        const updated = new Map(items);
        const item = updated.get(id);
        if (item) {
            item.selected = !item.selected;
            updated.set(id, item);
            pendingItems.set(id, item);
            localStorage.setItem('cachedItems', JSON.stringify(Array.from(updated.entries())));
            setItems(updated);
        }
    };

    const onDragStart = (_: React.DragEvent, id: string) => {
        DraggingId = id;
    };

    const onDrop = (_: React.DragEvent, id: string) => {
        if (!DraggingId || DraggingId === id) return;

        const updated = new Map(items);
        const item1 = updated.get(DraggingId);
        const item2 = updated.get(id);

        if (item1 && item2) {
            const temp = item1.position;
            item1.position = item2.position;
            item2.position = temp;

            updated.set(item1.id, item1);
            updated.set(item2.id, item2);
            pendingItems.set(item1.id, item1);
            pendingItems.set(item2.id, item2);

            localStorage.setItem('cachedItems', JSON.stringify(Array.from(updated.entries())));
            setItems(updated);
        }

        DraggingId = null;
    };

    const onDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setOffset(0);
        setItems(new Map());
    };

    return (
        <div style={{padding: '20px', fontFamily: 'Arial'}}>
            <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={handleSearchInput}
                style={{marginBottom: '15px', padding: '8px', width: '250px'}}
            />
            <InfiniteScroll
                dataLength={items.size}
                next={() => fetchItems()}
                hasMore={hasMore}
                loader={
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            border: '4px solid #f3f3f3',
                            borderTop: '4px solid #3498db',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            animation: 'spin 1s linear infinite'
                        }}/>
                    </div>
                }
                height={900}
                style={{paddingBottom: '100px'}}
            >
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead style={{background: '#f2f2f2'}}>
                    <tr>
                        <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #ccc'}}>№</th>
                        <th style={{padding: '12px', textAlign: 'center', borderBottom: '1px solid #ccc'}}>Name</th>
                        <th style={{padding: '12px', textAlign: 'center', borderBottom: '1px solid #ccc'}}>Select</th>
                    </tr>
                    </thead>
                    <tbody>
                    {Array.from(items.values())
                        .sort((a, b) => a.position - b.position)
                        .map((item) => (
                            <tr
                                key={item.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, item.id)}
                                onDrop={(e) => onDrop(e, item.id)}
                                onDragOver={onDragOver}
                                style={{
                                    backgroundColor: item.selected ? 'rgba(173, 216, 230, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                                    cursor: 'grab',
                                    textAlign: 'center',
                                    borderBottom: '1px solid #ddd',
                                    transition: 'background-color 0.3s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(135,206,250,0.5)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.selected ? 'rgba(173, 216, 230, 0.4)' : 'rgba(255, 255, 255, 0.8)')}
                            >
                                <td style={{padding: '10px', textAlign: 'left'}}>
                                    {item.position}
                                </td>
                                <td style={{padding: '10px'}}>{item.name}</td>
                                <td style={{padding: '10px'}}>
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
