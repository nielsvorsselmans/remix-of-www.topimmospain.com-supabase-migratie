// Helper: detect markdown patterns in text
export const looksLikeMarkdown = (text: string) => {
  return /^#{1,6}\s|^-\s|^\*\s|^\d+\.\s/m.test(text);
};

// Helper: strip wrapping <p> tags from ReactQuill output
export const getCleanNotes = (html: string) => {
  return html.replace(/<\/?p>/g, '').trim();
};

// Helper: strip HTML tags for AI processing
export const stripHtml = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// ReactQuill toolbar configuration
export const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ]
};
