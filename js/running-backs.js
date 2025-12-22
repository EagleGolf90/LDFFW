// Running Backs/Wide Receivers CRUD Operations

const storage = new RunningBacksStorage();

// DOM Elements
const addRuleForm = document.getElementById('addRuleForm');
const rulesList = document.getElementById('rulesList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    displayRules();
    addRuleForm.addEventListener('submit', handleAddRule);
});

// Handle Add Rule
function handleAddRule(e) {
    e.preventDefault();

    const description = document.getElementById('ruleDescription').value.trim();
    const points = document.getElementById('rulePoints').value;
    const type = document.getElementById('ruleType').value;

    if (!description || !points) {
        alert('Please fill in all fields');
        return;
    }

    storage.addRule(description, points, type);
    addRuleForm.reset();
    displayRules();
}

// Display all rules
function displayRules() {
    const rules = storage.getRules();
    
    if (rules.length === 0) {
        rulesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-message">No scoring rules yet</div>
                <p>Add your first rule using the form above</p>
            </div>
        `;
        return;
    }

    rulesList.innerHTML = rules.map(rule => createRuleElement(rule)).join('');

    // Attach event listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => enableEditMode(e.target.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => deleteRule(e.target.dataset.id));
    });

    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', (e) => saveEdit(e.target.dataset.id));
    });

    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => cancelEdit(e.target.dataset.id));
    });
}

// Create rule element HTML
function createRuleElement(rule) {
    return `
        <div class="rule-item" id="rule-${rule.id}">
            <div class="rule-header">
                <div class="rule-info">
                    <div class="rule-description">${escapeHtml(rule.description)}</div>
                    <div class="rule-metadata">
                        <span class="rule-points ${rule.type}">${rule.points > 0 ? '+' : ''}${rule.points} pts</span>
                        <span class="rule-type" style="color: #999;">Type: ${rule.type}</span>
                    </div>
                </div>
                <div class="rule-actions">
                    <button class="btn btn-edit" data-id="${rule.id}">Edit</button>
                    <button class="btn btn-delete" data-id="${rule.id}">Delete</button>
                </div>
            </div>
            <div class="rule-edit-form" id="edit-form-${rule.id}" style="display: none;">
                <div class="form-group">
                    <label for="edit-desc-${rule.id}">Description:</label>
                    <input type="text" id="edit-desc-${rule.id}" value="${escapeHtml(rule.description)}" />
                </div>
                <div class="form-group">
                    <label for="edit-pts-${rule.id}">Points:</label>
                    <input type="number" id="edit-pts-${rule.id}" value="${rule.points}" step="0.1" />
                </div>
                <div class="form-group">
                    <label for="edit-type-${rule.id}">Type:</label>
                    <select id="edit-type-${rule.id}">
                        <option value="normal" ${rule.type === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="bonus" ${rule.type === 'bonus' ? 'selected' : ''}>Bonus</option>
                        <option value="negative" ${rule.type === 'negative' ? 'selected' : ''}>Negative</option>
                    </select>
                </div>
                <div class="edit-form-actions">
                    <button class="btn btn-save" data-id="${rule.id}">Save</button>
                    <button class="btn btn-cancel" data-id="${rule.id}">Cancel</button>
                </div>
            </div>
        </div>
    `;
}

// Enable edit mode
function enableEditMode(id) {
    const ruleItem = document.getElementById(`rule-${id}`);
    const editForm = document.getElementById(`edit-form-${id}`);
    
    ruleItem.classList.add('edit-mode');
    editForm.style.display = 'block';
}

// Cancel edit
function cancelEdit(id) {
    const ruleItem = document.getElementById(`rule-${id}`);
    const editForm = document.getElementById(`edit-form-${id}`);
    
    ruleItem.classList.remove('edit-mode');
    editForm.style.display = 'none';
}

// Save edit
function saveEdit(id) {
    const description = document.getElementById(`edit-desc-${id}`).value.trim();
    const points = document.getElementById(`edit-pts-${id}`).value;
    const type = document.getElementById(`edit-type-${id}`).value;

    if (!description || !points) {
        alert('Please fill in all fields');
        return;
    }

    storage.updateRule(id, description, points, type);
    displayRules();
}

// Delete rule
function deleteRule(id) {
    if (confirm('Are you sure you want to delete this rule?')) {
        storage.deleteRule(id);
        displayRules();
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
