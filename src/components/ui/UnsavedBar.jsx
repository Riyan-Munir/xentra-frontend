import { createPortal } from 'react-dom'

export default function UnsavedBar({ show, onSave, onCancel }) {
    if (!show) return null

    return createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-50 glass rounded-none border-b-0 border-t border-white/10 animate-slide-up">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-amber-400">⚠ You have unsaved changes</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-1.5 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="px-4 py-1.5 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors cursor-pointer"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
