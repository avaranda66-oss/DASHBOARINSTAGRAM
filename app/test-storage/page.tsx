'use client';

import { useEffect, useState } from 'react';

export default function TestStorage() {
    const [data, setData] = useState<any>({});

    useEffect(() => {
        const result: any = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                result[key] = localStorage.getItem(key);
            }
        }
        setData(result);
    }, []);

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">LocalStorage Dump</h1>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}
