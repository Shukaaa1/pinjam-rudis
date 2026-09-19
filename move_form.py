import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the form div
start_marker = '<!-- INLINE FORM PEMESANAN (Pojok Bawah Selebar Tabel) -->'
end_marker = '</form>\n                            </div>'

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Start marker not found")
    exit(1)

# Find the exact end by locating </form> and the next </div>
form_end_idx = content.find('</form>', start_idx)
div_end_idx = content.find('</div>', form_end_idx) + 6

# The entire block to remove
block_to_remove = content[start_idx:div_end_idx]

# Extract just the <form ...> ... </form>
form_start_idx = block_to_remove.find('<form')
form_end_idx = block_to_remove.find('</form>') + 7
form_content = block_to_remove[form_start_idx:form_end_idx]

# Construct the new modal HTML
modal_html = f"""
    <!-- Modal Form Pemesanan -->
    <div id="booking-modal" class="modal-backdrop hidden">
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h5><i class="fa fa-edit"></i> Form Pemesanan Ruang Diskusi</h5>
                <button class="modal-close" onclick="closeModal('booking-modal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 15px; font-size: 0.9rem; color: #6c757d;">
                    Silakan lengkapi data pemesanan di bawah ini. Pastikan Anda telah memilih jadwal yang tepat.
                </div>
                {form_content}
            </div>
        </div>
    </div>
"""

# Remove the inline form block
new_content = content[:start_idx] + content[div_end_idx:]

# Insert the modal just before the script tag
script_marker = '<!-- Script Application Logic -->'
script_idx = new_content.find(script_marker)

if script_idx != -1:
    new_content = new_content[:script_idx] + modal_html + '\n    ' + new_content[script_idx:]
else:
    new_content += modal_html

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Migration to modal successful.")
