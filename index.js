const fetch = require('node-fetch')
const {json} = require('micro')

// Number of approvals: 'label'
const labelsMap = {
    0: null,
    1: 'first approval',
    2: 'ready to merge'
};

module.exports = async req => {
    const webhook = await json(req)
    if (!webhook.pull_request) {
        console.log(webhook);
    }
    const request = (url, options) => fetch(url, Object.assign({}, {headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` }}, options))

    // Fetch approvals
    const reviews = await request(webhook.pull_request.url + '/reviews').then(res => res.json())

    // Get existing labels
    const labels_url = `${webhook.pull_request.issue_url}/labels`;
    const labels = await request(labels_url)
        .then(res => res.json())
        .then(labels => labels.map(label => label.name))

    // Set new labels
    let newLabels = replaceLabel(labelForReviews(reviews), labels);

    if (approvedCount(reviews) >= 2) {
        newLabels = newLabels.filter(label => label !== 'ready for review');
    }

    return await request(labels_url, {
        method: 'PUT',
        body: JSON.stringify(newLabels)
    }).then(res => res.json())
}

/**
 * Returns count of approved reviews
 */
const approvedCount = reviews => reviews.filter(review => review.state === 'APPROVED').length

/**
 * Returns the label to set on the PR for list of reviews
 */
const labelForReviews = reviews => labelsMap[approvedCount(reviews)]

/**
 * Removes labels from label map and adds specified label
 */
const replaceLabel = (label, labels) => labels
    .filter(label => Object.values(labelsMap).indexOf(label) === -1)
    .concat([label])
    .filter(label => label !== null)
