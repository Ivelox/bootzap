var _ = require('./lodash'),
    parseBody = require('./util/parseBody'),
    sanitize = require('./util/sanitize').sanitize;

/**
 * Used to parse the request headers
 * 
 * @param  {Object} request - postman SDK-request object 
 * @param  {String} indentation - used for indenting snippet's structure
 * @returns {String} - request headers in the desired format
 */
function getHeaders (request, indentation) {
    var headerObject = request.getHeaders({enabled: true}),
        headerMap;

    if (!_.isEmpty(headerObject)) {
        headerMap = _.map(Object.keys(headerObject), function (key) {
            return `${indentation}--header '${sanitize(key, 'header')}: ` +
            `${sanitize(headerObject[key], 'header')}' \\`;
        });
        return headerMap.join('\n');
    }
    return `${indentation}--header '' \\`;
}

module.exports = {
    /**
     * Used to return options which are specific to a particular plugin
     * 
     * @module getOptions
     * 
     * @returns {Array}
     */
    getOptions: function () {
        // options can be added for this for no certificate check and silent so no output is logged.
        // Also, place where to log the output if required.
        return [
            {
                name: 'Indent Count',
                id: 'indentCount',
                type: 'integer',
                default: 4,
                description: 'Integer denoting count of indentation required'
            },
            {
                name: 'Indent type',
                id: 'indentType',
                type: 'String',
                default: 'space',
                description: 'String denoting type of indentation for code snippet. eg: \'space\', \'tab\''
            },
            {
                name: 'Request Timeout',
                id: 'requestTimeout',
                type: 'integer',
                default: 0,
                description: 'Integer denoting time after which the request will bail out in milliseconds'
            },
            {
                name: 'Follow redirect',
                id: 'followRedirect',
                type: 'boolean',
                default: true,
                description: 'Boolean denoting whether or not to automatically follow redirects'
            },
            {
                name: 'Body trim',
                id: 'requestBodyTrim',
                type: 'boolean',
                default: false,
                description: 'Boolean denoting whether to trim request body fields'
            }
        ];
    },

    /**
    * Used to convert the postman sdk-request object in php-curl reuqest snippet 
    * 
    * @module convert
    * 
    * @param  {Object} request - postman SDK-request object
    * @param  {Object} options
    * @param  {String} options.indentType - type of indentation eg: space / tab (default: space)
    * @param  {Number} options.indentCount - frequency of indent (default: 4 for indentType: space, 
                                                                    default: 1 for indentType: tab)
    * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
                                                (default: 0 -> never bail out)
    * @param {Boolean} options.requestBodyTrim : whether to trim request body fields (default: false)
    * @param {Boolean} options.followRedirect : whether to allow redirects of a request
    * @param  {Function} callback - function with parameters (error, snippet)
    */
    convert: function (request, options, callback) {
        var snippet = '',
            indentation = '',
            identity = '';

        if (_.isFunction(options)) {
            callback = options;
            options = {};
        }
        else if (!_.isFunction(callback)) {
            throw new Error('Shell-wget~convert: Callback is not a function');
        }

        identity = options.indentType === 'tab' ? '\t' : ' ';
        indentation = identity.repeat(options.indentCount || (options.indentType === 'tab' ? 1 : 4));
        // concatenation and making up the final string

        snippet = 'wget --no-check-certificate --quiet \\\n';
        snippet += `${indentation}--method ${request.method} \\\n`;
        // console.log(getHeaders(request, indentation));
        // Shell-wget accepts timeout in seconds (conversion from milli-seconds to seconds)
        if (options.requestTimeout > 0) {
            snippet += `${indentation}--timeout=${Math.floor(options.requestTimeout / 1000)} \\\n`;
        }
        // Shell-wget supports 20 redirects by default (without any specific options)
        if (typeof options.followRedirect === 'boolean' && !options.followRedirect) {
            snippet += `${indentation}--max-redirect=0 \\\n`;
        }
        snippet += `${getHeaders(request, indentation)}\n`;
        snippet += `${parseBody(request.toJSON(), options.requestBodyTrim, indentation)}`;
        snippet += `${indentation}--output-document=shellWget.txt \\\n`;
        snippet += `${indentation}- '${request.url.toString()}'`;

        return callback(null, snippet);
    }
};