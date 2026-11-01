import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

/** Liste déroulante au même style sur Windows, Linux et dans les navigateurs. */
export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <span className="relative inline-flex items-center">
            <select
                {...props}
                className={`appearance-none bg-raised border border-line text-fg rounded-lg outline-none focus:ring-2 focus:ring-accent pe-8 disabled:opacity-60 ${className}`}
            >
                {children}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute end-2.5 text-muted" />
        </span>
    )
}
