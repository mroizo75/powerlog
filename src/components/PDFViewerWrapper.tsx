import { PDFViewer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

interface PDFViewerWrapperProps {
  children: ReactElement<DocumentProps>;
  className?: string;
}

const PDFViewerWrapper = ({ children, className }: PDFViewerWrapperProps) => {
  return (
    <PDFViewer className={className}>
      {children}
    </PDFViewer>
  );
};

export default PDFViewerWrapper; 