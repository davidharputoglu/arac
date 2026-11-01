import type { ReactNode } from 'react'
import { isDesktop, openUrl } from '../engines/desktop'

export const AUTHOR = 'David HARPUTOGLU'
export const AUTHOR_EMAIL = 'kasparof57@gmail.com'

/** Lien externe : navigateur du système sur le bureau, nouvel onglet sur le web. */
export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className={className ?? 'text-accent hover:underline'}
            onClick={(e) => {
                if (isDesktop) {
                    e.preventDefault()
                    void openUrl(href)
                }
            }}
        >
            {children}
        </a>
    )
}
