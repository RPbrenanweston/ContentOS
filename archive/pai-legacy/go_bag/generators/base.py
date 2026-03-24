"""Base class for document generators."""

from abc import ABC, abstractmethod
from go_bag.core import ClientContext


class DocumentGenerator(ABC):
    """Abstract base class for all document generators."""

    @abstractmethod
    def generate(self, context: ClientContext) -> str:
        """
        Generate document content.

        Args:
            context: ClientContext with brand intelligence

        Returns:
            Markdown content as string
        """
        pass

    @abstractmethod
    def filename(self) -> str:
        """Return the output filename for this document."""
        pass
