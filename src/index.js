import "babel-polyfill";
import React from 'react';
import PropTypes from 'prop-types';
import {
    Row, Col, FormGroup, FormControl, ControlLabel, HelpBlock, OverlayTrigger,
    Tooltip
} from 'react-bootstrap';

import FormValidator from '../validation/form-validator.js';

import { convertToRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import 'style-loader!css-loader!react-draft-wysiwyg/dist/react-draft-wysiwyg.css';


export default class FormFields extends React.Component {
    constructor(props) {
        super(props);

        this.resources = this.props.resources;

        this.state = {
            formValid: false,
            fields: this.props.fields,
            errors: [],
            actions: []
        };

        if (this.props.actions) {
            this.props.actions.map((i) => { 
                this.state.actions.push(React.cloneElement(i.template, { onClick: () => this.handleAction(i) }));
            });
        }

        this.getValidationState = this.getValidationState.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleUploadFile = this.handleUploadFile.bind(this);
        this.handleEditorStateChange = this.handleEditorStateChange.bind(this);
        this.validateAll = this.validateAll.bind(this);
        this.validateField = this.validateField.bind(this);
        this.handleAction = this.handleAction.bind(this);


    }

    
    componentDidMount() {
        
    }


    componentWillReceiveProps(nextProps) {
        
        if (nextProps.fields !== this.state.fields) {
            this.setState({
                fields: nextProps.fields
            });
        }

    }

    handleAction(action) {
        let valid = true;
        if (action.validate) {
            valid = this.validateAll();
        }

        if (typeof action.handler === "function") {
            action.handler(valid);
        }
    }

    validateAll(callback) {
        let formValid = true;
        let errors = [];
        Object.getOwnPropertyNames(this.state.fields).forEach(field => {
            let validatedField = FormValidator.getValidatedField(this.state.fields[field], this.resources, false);

            if (validatedField.error) {
                formValid = false;
                errors.push({ field: field, type: validatedField.error, message: validatedField.errorMsg });
            }
        });
        
        this.setState({
            errors
        }, callback);

        return formValid;
    }

    getErrorMsg(field) {
        let error = this.state.errors.find(x => x.field === field);
        if (error) {
            return error.message;
        } else {
            return '';
        }
    }

    getValidationState(field) {
        let error = this.state.errors.find(x => x.field === field);
        if (error) {
            return error.type;
        }
    }

    handleChange(e) {
        const { target } = e;
        let { id } = target;
        let value = undefined;

        switch (target.type) {
            case 'checkbox':
                value = target.checked;
                break;
            case 'radio':
                id = target.name;
                break;
            default:
                value = target.value;
        }

        if (this.state.fields[id].validations) {
            this.validateField(id, value);
        } else {
            this.setState({
                fields: {
                    ...this.state.fields,
                    [id]: {
                        ...this.state.fields[id],
                        value
                    }
                }
            }, () => {
                this.props.onChange(this.state.fields);
            });
        }
    }

    handleUploadFile(e) {
        let id = e.target.id;
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.onloadend = () => {
            let f = reader.result;
            //if a file is selected


            //if field has validations
            if (this.state.fields[id].validations) {
                this.validateField(id, f);
            } else {
                this.setState({
                    fields: {
                        ...this.state.fields,
                        [id]: {
                            ...this.state.fields[id],
                            value: f,
                            name: file.name
                        }
                    }
                }, () => this.props.onChange(this.state.fields));
            }

        };
        if (file) {
            //read file and when reader is loadend then you can get the reader.result as a URL
            reader.readAsDataURL(file);
        }
        else {
            //if there is no selected file then reset the values of this field.
            this.setState({
                fields: {
                    ...this.state.fields,
                    [id]: {
                        ...this.state.fields[id],
                        value: '',
                        name: ''
                    }
                }
            }, () => {
                if (this.state.fields[id].validations) {
                    let validatedField = FormValidator.getValidatedField(field, this.resources, false);
                    this.setState({
                        fields: {
                            ...this.state.fields,
                            [id]: validatedField
                        }
                    }, () => {
                        this.props.onValidation(!validatedField.error);
                    });
                }
                this.props.onChange(this.state.fields);
            });
        }
    }

    handleEditorStateChange(id, editorState) {
        let value = draftToHtml(convertToRaw(editorState.getCurrentContent()));
        this.setState({
            fields: {
                ...this.state.fields,
                [id]: {
                    ...this.state.fields[id],
                    editorState,
                    value
                }
            }
        }, () => {
            if (this.state.fields[id].validations) {
                this.validateField(id, value);
            }
            else {
                this.props.onChange(this.state.fields);
            }
        });
    }

    validateField(id, value) {
        let field = {
            ...this.state.fields[id],
            value
        };

        let validatedField = FormValidator.getValidatedField(field, this.resources, false);
        let errors = this.state.errors;
        let errIndex = this.state.errors.findIndex(err => err.field === id);

        if (validatedField.error && errIndex < 0) {
            errors.push({ field: id, type: validatedField.error, message: validatedField.errorMsg });
        }
        else if (!validatedField.error && errIndex > -1) {
            errors.splice(errIndex, 1);
        }

        this.setState({
            fields: {
                ...this.state.fields,
                [id]: field
            },
            errors

        }, () => {
            this.props.onChange(this.state.fields);
        });
    }

    render() {

        return (
            <Row>
                {
                    Object.getOwnPropertyNames(this.state.fields).map(o => {
                        var i;
                        switch (this.state.fields[o].type) {
                            case 'text':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                            <FormControl type="text" value={this.state.fields[o].value} onChange={(e) => this.handleChange(e)} />
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                break;
                            case 'file':
                                let downloadFile = '';

                                if (this.props.editMode && this.state.fields[o].url) {
                                    downloadFile = (
                                        <OverlayTrigger placement="left" overlay={<Tooltip id={'l1_script'} placement="top" className="in">Download</Tooltip>}>
                                            <a href={this.state.fields[o].url} className='btn-download' download>
                                                Download <i className="far fa-file-code fa-lg" />
                                            </a>
                                        </OverlayTrigger>
                                    );
                                }


                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                            <FormControl type="file" accept=".jpg" onChange={(e) => this.handleUploadFile(e)} />
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                        {downloadFile}
                                    </Col>
                                );
                                break;
                            case 'richText':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                            <Editor
                                                editorState={this.state.fields[o].editorState}
                                                wrapperClassName="demo-wrapper"
                                                editorClassName="demo-editor"
                                                onEditorStateChange={(s) => { this.handleEditorStateChange(o, s); }} />
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                break;
                        }

                        return i;
                    })
                }
                <Col sm={12}>
                    {this.state.actions.map((i) => [i, ' '])}
                </Col>
            </Row>
        );
    }
}


FormFields.propTypes = {
    fields: PropTypes.object.isRequired,
    resources: PropTypes.object,
    onChange: PropTypes.func,
    editMode: PropTypes.bool,
    actions: PropTypes.array
};
