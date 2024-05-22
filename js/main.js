// Define the repository URL
const repositoryUrl = 'https://api.github.com/repos/JoshuaAPhillips/digital-anon';


var data = [];
let progressBar = { count: 0, processedCount: 0, message: '' };
let xml_annotation = '';
let selectedFilter = 'fullText';

loadAnnotationXML()

async function loadAnnotationXML() {
    if (!localStorage.getItem('anonDataAnnotation')) {
        let annotationFileURL = `https://raw.githubusercontent.com/JoshuaAPhillips/digital-anon/main/resources/annotations.xml`;
        let callFetch = await fetch(annotationFileURL);
        var fileContent = await callFetch.text();
        localStorage.setItem('anonDataAnnotation', fileContent);
    }
    else {
        var fileContent = localStorage.getItem('anonDataAnnotation')
    }

    // Create a new DOMParser
    const parser = new DOMParser();
    // Parse the XML string
    xml_annotation = parser.parseFromString(fileContent, 'text/xml');
    //console.log(xml_annotation)
}

if (!localStorage.getItem('anonData'))
    mainMethod();
else {
    data = JSON.parse(localStorage.getItem('anonData'))
    showData(data);
    // Example usage: Synchronize data with GitHub
    //synchronizeWithGitHub();
}

async function synchronizeWithGitHub() {
    try {
        // Fetch the latest commit
        const commitResponse = await fetch(`${repositoryUrl}/commits`);
        if (!commitResponse.ok) {
            throw new Error('Failed to fetch commits');
        }
        const commits = await commitResponse.json();

        if (commits.length === 0) {
            console.log('No commits found.');
            return;
        }

        // Extract the latest commit
        const latestCommitSha = commits[0].sha;

        let savedSHA = localStorage.getItem('anonDataLastSHA')
        if (latestCommitSha !== savedSHA) {
            // Fetch the details of the latest commit
            const commitDetailsResponse = await fetch(`${repositoryUrl}/commits/${latestCommitSha}`);
            if (!commitDetailsResponse.ok) {
                throw new Error('Failed to fetch commit details');
            }
            const commitDetails = await commitDetailsResponse.json();

            // Extract the list of modified files in the latest commit
            const modifiedFiles = commitDetails.files;

            // Filter out XML files
            const modifiedXMLFiles = modifiedFiles.filter(file => file.filename.endsWith('.xml'));

            progressBar.count = modifiedXMLFiles.length;
            progressBar.processedCount = 0;

            document.getElementById('btnProgressModal').click();
            updateProgressContent();

            let isChanged = false;
            // Fetch and process each modified XML file
            for (const xmlFile of modifiedXMLFiles) {
                if (!xmlFile.filename.includes('annotations')) {
                    const fileUrl = `${repositoryUrl}/contents/${xmlFile.filename}`;
                    const fileResponse = await fetch(fileUrl);
                    if (!fileResponse.ok) {
                        console.log(`Failed to fetch ${xmlFile.filename}`);
                        document.getElementById('btnHideProgessModal').click();
                        return;
                    }
                    const fileContent = await fileResponse.text();

                    // Create a new DOMParser
                    const parser = new DOMParser();

                    // Parse the XML string
                    const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
                    const body = xmlDoc.getElementsByTagName('body')

                    if (body.length > 0) {
                        if (body[0].textContent.replace(/\s+/g, ' ').replace(/\\/g, '').trim() !== '') {
                            let obj = {
                                //fileName: xmlFile.name,
                                fullText: body[0].textContent.replace(/\s+/g, ' ').replace(/\\/g, '').trim(),
                                fullHTML: body[0].innerHTML,
                                //fileURL: xmlFile.download_url,
                                title: xmlDoc.getElementsByTagName('title').length > 0 ? xmlDoc.getElementsByTagName('title')[0].textContent : 'N/A',
                                author: xmlDoc.getElementsByTagName('author').length > 0 ? xmlDoc.getElementsByTagName('author')[0].textContent : 'N/A',
                                idno: xmlDoc.getElementsByTagName('idno').length > 0 ? xmlDoc.getElementsByTagName('idno')[0].textContent : 'N/A',
                                encodedBy: xmlDoc.getElementsByTagName('respStmt').length > 0 ? xmlDoc.getElementsByTagName('respStmt')[0].getElementsByTagName('name')[0].textContent : 'N/A',
                                physDesc: xmlDoc.getElementsByTagName('physDesc').length ? xmlDoc.getElementsByTagName('physDesc')[0].textContent.replace(/\s+/g, ' ').replace(/\\/g, '').trim() : 'N/A',
                                persons: [...new Set(getRSData(xmlDoc, body[0], 'person'))],
                                places: [...new Set(getRSData(xmlDoc, body[0], 'place'))],
                                objects: [...new Set(getRSData(xmlDoc, body[0], 'object'))],
                                literaryWork: [...new Set(getRSData(xmlDoc, body[0], 'literary-work'))]
                            }

                            let index = data.findIndex(x => x.fileName === obj.fileName && x.idno === obj.idno)
                            if (index > -1) {
                                data[index] = obj;
                                isChanged = true;
                            }
                        }
                    }
                }
                else if (xmlFile.filename.includes('annotations')) {
                    let annotationFileURL = `https://raw.githubusercontent.com/JoshuaAPhillips/digital-anon/main/resources/annotations.xml`;
                    let callFetch = await fetch(annotationFileURL);
                    let fileContent = await callFetch.text();
                    localStorage.setItem('anonDataAnnotation', fileContent);
                }

                progressBar.processedCount = progressBar.processedCount + 1;

                if (progressBar.processedCount >= progressBar.count)
                    progressBar.processedCount = progressBar.count
                // break;

                updateProgressContent();
            }

            if (isChanged)
                localStorage.setItem('anonData', JSON.stringify(data))

            localStorage.setItem('anonDataLastSHA', latestCommitSha)
        }
        console.log('Synchronization complete.');
        //showData(data)
        document.getElementById('btnHideProgessModal').click();

    } catch (error) {
        console.error('Error synchronizing with GitHub:', error);
        //loadPreviousVersion()
    } finally {
        document.getElementById('btnHideProgessModal').click();
        showData(data)
    }
}

function loadPreviousVersion() {
    //data = JSON.parse(localStorage.getItem('anonData'))
}

async function mainMethod() {
    try {
        let xmlFilesURL = `${repositoryUrl}/contents/transcriptions`;
        let callFetch = await fetch(xmlFilesURL);
        let xmlFiles = await callFetch.json();
        xmlFiles = xmlFiles.filter(file => file.name.endsWith('.xml'));
        var currentXMLFile;

        progressBar.count = xmlFiles.length;
        progressBar.processedCount = 0;

        document.getElementById('btnProgressModal').click();
        updateProgressContent();

        for (let xmlFile of xmlFiles) {
            currentXMLFile = xmlFile;
            callFetch = await fetch(xmlFile.download_url)
            let fileContent = await callFetch.text();

            // Create a new DOMParser
            const parser = new DOMParser();

            // Parse the XML string
            const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
            const body = xmlDoc.getElementsByTagName('body')

            if (body.length > 0) {
                if (body[0].textContent.replace(/\s+/g, ' ').replace(/\\/g, '').trim() !== '') {
                    let obj = {
                        fileName: xmlFile.name,
                        fullText: body[0].textContent.replace(/\s+/g, ' ').replace(/\\/g, '').trim(),
                        fullHTML: body[0].innerHTML,
                        fileURL: xmlFile.download_url,
                        title: xmlDoc.getElementsByTagName('title').length > 0 ? xmlDoc.getElementsByTagName('title')[0].textContent : 'N/A',
                        author: xmlDoc.getElementsByTagName('author').length > 0 ? xmlDoc.getElementsByTagName('author')[0].textContent : 'N/A',
                        idno: xmlDoc.getElementsByTagName('idno').length > 0 ? xmlDoc.getElementsByTagName('idno')[0].textContent : 'N/A',
                        encodedBy: xmlDoc.getElementsByTagName('respStmt').length > 0 ? xmlDoc.getElementsByTagName('respStmt')[0].getElementsByTagName('name')[0].textContent : 'N/A',
                        physDesc: xmlDoc.getElementsByTagName('physDesc').length ? xmlDoc.getElementsByTagName('physDesc')[0].textContent.replace(/\s+/g, ' ').replace(/\\/g, '').trim() : 'N/A',
                        persons: [...new Set(getRSData(xmlDoc, body[0], 'person'))],
                        places: [...new Set(getRSData(xmlDoc, body[0], 'place'))],
                        objects: [...new Set(getRSData(xmlDoc, body[0], 'object'))],
                        literaryWork: [...new Set(getRSData(xmlDoc, body[0], 'literary-work'))],
                    }

                    data.push(obj)
                }
            }

            progressBar.processedCount = progressBar.processedCount + 1;

            if (progressBar.processedCount >= progressBar.count)
                progressBar.processedCount = progressBar.count
            // break;

            updateProgressContent();
        }

        // get latest commit from repo
        const commitResponse = await fetch(`${repositoryUrl}/commits`);
        const commits = await commitResponse.json();
        // Extract the latest commit
        const latestCommitSha = commits[0].sha;

        loadAnnotationXML();
        localStorage.setItem('anonData', JSON.stringify(data));
        localStorage.setItem('anonDataLastSHA', latestCommitSha);

        //console.log(data)
        showData(data)
        document.getElementById('btnHideProgessModal').click();
    }
    catch (error) {
        console.log(currentXMLFile.download_url)
        console.log(error)
    }
    finally {
        document.getElementById('btnHideProgessModal').click();
    }
}

function showData(filteredData) {
    let html = '';
    for (let d of filteredData) {
        html += `<div class="search-result border-bottom mt-2" onclick="showDetail('${d.idno}', '${d.fileName}')">
                    <h4><a title="${d.title}" data-bs-toggle="offcanvas" href="#offcanvasDetails">${d.title.substring(0, 14)}...</a></h4>
                    <p class="text-secondary mb-0">
                        ${d.physDesc.substring(0, 150)} ... <br />
                        idno: ${d.idno}
                    </p>`;
        if (location.href.includes('compare')) {
            if (d.isAdded) {
                html += ` <span class="badge rounded-pill text-bg-danger mb-1" style="cursor:pointer;"    
                                    onclick="add_remove_CompareItems('${d.idno}', '${d.fileName}', 'remove')">
                                    <i class="far fa-times-circle"></i> Remove
                          </span>`;
            }
            else {
                html += ` <span class="badge rounded-pill text-bg-primary mb-1" style="cursor:pointer;"    
                            onclick="add_remove_CompareItems('${d.idno}', '${d.fileName}', 'add')">
                            <i class="fas fa-plus-circle"></i> Add
                            </span>`
            }
        }

        html += `</div>`;
    }

    document.getElementById('divResults').innerHTML = html;
}

function showDetail(idno, fileName) {
    let obj = data.find(x => x.idno === idno && x.fileName === fileName);
    //let s = obj.fullHTML.replaceAll('<l>', '<p>');
    let detailHTML = `
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="offcanvasExampleLabel">${obj.title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <div>
                    ${obj.physDesc}
                </div>
                <dl class="row mt-2">
                    <dt class="col-sm-3">idno</dt>
                    <dd class="col-sm-9">${obj.idno}</dd>

                    <dt class="col-sm-3">Persons</dt>
                    <dd class="col-sm-9">${obj.persons.join(', ')}</dd>

                    <dt class="col-sm-3">Places</dt>
                    <dd class="col-sm-9">${obj.places.join(', ')}</dd>

                    <dt class="col-sm-3">Literary Work</dt>
                    <dd class="col-sm-9">${obj.literaryWork.join(', ')}</dd>

                    <dt class="col-sm-3">Objects</dt>
                    <dd class="col-sm-9">${obj.objects.join(', ')}</dd>
                </dl>
                <div id="divText">
                 <h4 class="border-bottom">Text</h4>
                  ${obj.fullHTML.replaceAll('quote', 'blockquote').replaceAll('<l>', '<p>').replaceAll('</l>', '</p>')}
                </div>
            </div>
    `;

    document.getElementById('offcanvasDetails').innerHTML = detailHTML;
    $('add').addClass('text-success');
    $('del').addClass('text-danger');
    $('#divText').find('div').each(function () {
        if ($($(this)[0]).attr('xml:id')) {
            if (!$($(this)[0]).attr('xml:id').includes('v')) {
                $($(this)[0]).prepend(`<h3>Page: ${$($(this)[0]).attr('xml:id').replace('r', '')}</h3>`);
            }
        }
    })
    showPopover()
}

function updateProgressContent() {
    let percentage = parseInt(((progressBar.processedCount / progressBar.count) * 100).toString())
    document.getElementById('divProgressContent').innerHTML = ` 
                     <span class="float-end me-2" style="font-size: 10px;"> ${progressBar.processedCount}/${progressBar.count}
                        Processed</span>
                    <div class="progress mt-3" style="height: 3px;">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>`;
}

function getRSData(xmlDoc, body, attr) {
    let rsData = []
    let rsElements = xmlDoc.evaluate(`//*[@type='${attr}']`, body, null, XPathResult.ANY_TYPE, null);
    let rsNode = rsElements.iterateNext()
    while (rsNode) {
        rsData.push(rsNode.getAttribute('key') !== null ? rsNode.getAttribute('key').trim() : rsNode.textContent.trim())
        rsNode = rsElements.iterateNext();
    }

    return rsData;
}

//////////////////////////////////////////////////
function showPopover() {
    if ($('rs') !== undefined) {

        $('rs').each((index, element) => {
            if ($(element).attr('xml:id') !== undefined && $(element).attr('xml:id') !== null) {
                let id = $(element).attr('xml:id')//.split('#')[1]
                let type = $(element).attr('type')
                let details = xml_annotation.querySelectorAll(type); //xml_annotation.evaluate(`[xml\\:id='${id}']`, xml_annotation, null, XPathResult.ANY_TYPE, null);

                let xmlNode = '';
                let info = '';
                details.forEach(element => {
                    if (element.getAttribute('xml:id') === id) {
                        xmlNode = element;
                        return;
                    }
                });

                if (xmlNode instanceof Node) {
                    //var xmlString = serializer.serializeToString(info);
                    if (type === 'place') {
                        info = getPlaceInfo(xmlNode)
                    }
                    else if (type === 'person') {
                        info = getPersonInfo(xmlNode)
                    }
                }

                $(element).attr('tabindex', '0')
                $(element).attr('data-bs-toggle', 'popover')
                $(element).attr('data-bs-trigger', 'hover focus')
                $(element).attr('data-bs-custom-class', 'custom-popover')
                $(element).attr('html', 'true')
                $(element).attr('data-bs-title', `${capitalizeFirstLetter($(element).attr('type'))} Detail`)
                $(element).attr('data-bs-content', `${info}`)
            }
        })

        //new bootstrap.Popover(e.currentTarget)
        setTimeout(() => {
            const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
            const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl, { html: true }))
        }, 500);
    }
}

function getPlaceInfo(xmlNode) {
    return `<dl class="row mt-2">
                <dt class="col-sm-3">Name:</dt>
                <dd class="col-sm-8">${xmlNode.getElementsByTagName('placeName')[0].textContent}</dd>

                <dt class="col-sm-3">Region</dt>
                <dd class="col-sm-8">${xmlNode.getElementsByTagName('region')[0].textContent}</dd>

                <dt class="col-sm-3">Geo: </dt>
                <dd class="col-sm-8">${xmlNode.getElementsByTagName('geo')[0].textContent}</dd>

                <dt class="col-sm-3">Note: </dt>
                <dd class="col-sm-8">${xmlNode.getElementsByTagName('note')[0].textContent}</dd>
            </dl>`;
}

function getPersonInfo(xmlNode) {
    let birth = xmlNode.getElementsByTagName('event').length > 0 ? xmlNode.getElementsByTagName('event')[0].getAttribute('date') : '';
    let death = xmlNode.getElementsByTagName('event').length > 0 ? xmlNode.getElementsByTagName('event')[1].getAttribute('date') : '';

    let viaf = ''
    if (xmlNode.getElementsByTagName('idno').length > 0) {
        for (let i = 0; i < xmlNode.getElementsByTagName('idno').length; i++) {
            viaf += `<a href="${xmlNode.getElementsByTagName('idno')[0].textContent.split(' ')[0]}" target="_blank">${xmlNode.getElementsByTagName('idno')[0].textContent}</a>`
        }
    }
    let html = `<dl class="row mt-2">
                <dt class="col-sm-2">Name:</dt>
                <dd class="col-sm-10">${xmlNode.getElementsByTagName('persName').length > 0 ? xmlNode.getElementsByTagName('persName')[0].textContent : 'N/A'}</dd>
                `;
    if (birth !== '') {
        html += `<dt class="col-sm-2">Birth</dt>
                            <dd class="col-sm-10">${birth}</dd>
                            <dt class="col-sm-2">Death</dt>
                            <dd class="col-sm-10">${death}</dd>`;
    }
    if (viaf !== '') {
        html += `<dt class="col-sm-2">VIAF: </dt>
                            <dd class="col-sm-10">${viaf}</dd>`
    }

    html += `<dt class="col-sm-2">Note: </dt>
                    <dd class="col-sm-10">${xmlNode.getElementsByTagName('note')[0].textContent}</dd>
            </dl>`;

    return html;
}

function capitalizeFirstLetter(string) {
    if (string !== undefined && string !== '')
        return string.charAt(0).toUpperCase() + string.slice(1);
}

$('#txtSearch').on('input', e => {
    //console.log(e.currentTarget.value)
    filterSearch()
})

$('#selFilters').change((e) => {
    selectedFilter = $('#selFilters  :selected').val()
    $('#txtSearch').attr('placeholder', `Search ${$('#selFilters  :selected').text()}`)
    filterSearch()
})

function filterSearch() {
    let text = $('#txtSearch').val();
    if ('persons,objects,literaryWork,places'.includes(selectedFilter)) {
        var filteredData = data.filter(x => x[selectedFilter].join(' ').toLowerCase().includes(text) === true)
    } else {
        var filteredData = data.filter(x => x[selectedFilter].toLowerCase().includes(text) === true)
    }

    showData(filteredData)
}

function clearCache() {
    let sure = confirm('Are you sure to clear your cache?')
    if (sure) {
        localStorage.removeItem('anonData');
        localStorage.removeItem('anonDataLastSHA');
        localStorage.removeItem('anonDataAnnotation');
        location.reload();
    }
}

hotkeys('ctrl+shift+s,ctrl+shift+c', function (event, handler) {
    switch (handler.key) {
        case "ctrl+shift+s":
            synchronizeWithGitHub();
            break;
        case "ctrl+shift+c":
            clearCache()
            break;
    }
});
//////////////////////////////////////////////////
// const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
// const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))
// const popover = new bootstrap.Popover('.popover-dismiss', {
//     trigger: 'focus'
// })