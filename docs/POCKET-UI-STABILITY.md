# Pocket loading and modal stability

The settings page supplied a new `onDataLoaded` function on every render. The pocket component included that function in its fetch callback dependencies. Receiving data updated parent state, changed the callback, and restarted the fetch effect, repeatedly replacing the cards with loading placeholders.

The page now passes the stable state setter. The component keeps the latest notification callback in a ref so callback changes do not trigger network requests. The sorted pocket array is memoized to avoid resetting edit drafts on unrelated renders. The shared modal also keeps its latest close callback in a ref; changing an inline callback no longer tears down the focus trap and moves focus to the close button while typing.

The settings page uses one Sync/Edit action group and removes the repeated introduction. Other pocket views retain their own actions.

Validation: production build and existing overview/dashboard-data checks pass. In the local SQLite preview, pocket cards remain visible without loading placeholders after closing edit; sequentially typing into the first target produces `123.456` and keeps the input focused. The draft was cancelled. Final browser inspection checks the single action group and the parent edit form. No production data was changed.

The previously reviewed pocket balance calculation issues and universal account-selection UI are separate work and are not fixed by this change.
