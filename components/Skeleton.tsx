import React from 'react';

export const ShoppingListSkeleton = () => {
  return (
    <div className="space-y-3 p-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" /> {/* Checkbox */}
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" /> {/* Nome */}
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/4" /> {/* Categoria */}
          </div>
          <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded" /> {/* Preço */}
        </div>
      ))}
    </div>
  );
};
