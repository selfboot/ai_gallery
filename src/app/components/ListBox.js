'use client';

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';

export function CustomListbox({ value, onChange, options, className }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border shadow-sm hover:bg-gray-50">
          <span className="block truncate">{value}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </ListboxButton>

        <ListboxOptions className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 py-1 ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {options.map((option) => (
            <ListboxOption
              key={option}
              value={option}
              className={({ selected }) =>
                `relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                  selected ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                }`
              }
            >
              {({ selected }) => (
                <>
                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{option}</span>
                  {selected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
