import reflex as rx

class IndexState(rx.State):
    # Variables
    last_temperature: float
    # Flag set on page load so we can conditionally render scripts / triggers
    page_loaded: bool = False

    # Events
    @rx.event
    def index_on_load_event(self):
        # Mark page as loaded; this will cause a re-render and allow
        # conditional scripts (rendered in the component tree) to execute.
        self.page_loaded = True

