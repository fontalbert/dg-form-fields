import "babel-polyfill";
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
    Row, Col, FormGroup, FormControl, ControlLabel, HelpBlock, OverlayTrigger,
    Tooltip, Radio
} from 'react-bootstrap';

import MaskedInput from 'react-text-mask';
import TextareaAutosize from 'react-autosize-textarea';
import FormValidator from '../validation/form-validator.js';

import { convertToRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import 'style-loader!css-loader!react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

import Datetime from 'react-datetime';
import 'style-loader!css-loader!react-datetime/css/react-datetime.css';


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
            let index = 0;
            this.props.actions.map((i) => {
                index++;
                this.state.actions.push(React.cloneElement(i.template, { onClick: () => this.handleAction(i), key: 'action' + index + this.props.Id }));
            });
            
        }

        this.getValidationState = this.getValidationState.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleUploadFile = this.handleUploadFile.bind(this);
        this.handleEditorStateChange = this.handleEditorStateChange.bind(this);
        this.handleDateChange = this.handleDateChange.bind(this);
        this.validateAll = this.validateAll.bind(this);
        this.validateField = this.validateField.bind(this);
        this.handleAction = this.handleAction.bind(this);


    }

    componentWillReceiveProps(nextProps) {

        let newState = {};

        if (nextProps.fields !== this.state.fields) {
            newState = {
                fields: nextProps.fields,
                errors: []
            };
        }

        if (nextProps.actions && nextProps.actions !== this.state.actions) {
            let newActions = [];
            nextProps.actions.map((i) => {
                newActions.push(React.cloneElement(i.template, { onClick: () => this.handleAction(i) }));
            });
            newState = {
                ...newState,
                actions: newActions
            };
        }

        if (newState) {
            this.setState(newState);
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

    handleBlur(e) {
        if (typeof this.props.onBlurField === 'function') {
            let valid = this.validateAll();
            this.props.onBlurField(this.state.fields, valid);
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
                value = target.value;
                break;
            default:
                value = target.value;
                break;
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

    handleDateChange(date, id, f) {
        // Datetime control
        let value = date.format(f);

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
            <div key={this.props.Id ? this.props.Id : 'form-fields'} className={'form'}>
                {
                    Object.getOwnPropertyNames(this.state.fields).map(o => {
                        var i;
                        switch (this.state.fields[o].type) {
                            case 'text':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>{' '}
                                            <FormControl type="text" value={this.state.fields[o].value} placeholder={this.state.fields[o].placeholder}
                                                onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} autoComplete="off" />
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                if (this.props.inline) {
                                    i = (
                                        <div key={o} className={'col-sm-' + this.state.fields[o].columns}>
                                            <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                                <div className="row">
                                                    {this.state.fields[o].label ?
                                                        <div className={this.state.fields[o].labelCols ? 'col-sm-' + this.state.fields[o].labelCols : 'col-sm-3'}>
                                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                                        </div> : ''}
                                                    <div className={this.state.fields[o].labelCols || this.state.fields[o].labelCols === 0 ? 'col-sm-' + (12 - this.state.fields[o].labelCols) : 'col-sm-9'}>
                                                        <FormControl type="text" value={this.state.fields[o].value} placeholder={this.state.fields[o].placeholder}
                                                            onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} autoComplete="off" />
                                                        <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                                    </div>
                                                    
                                                </div>
                                            </FormGroup>
                                        </div>
                                    );
                                }

                                break;
                            case 'datetime':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>{' '}
                                            <Datetime id={o} dateFormat={this.state.fields[o].format} timeFormat={false} value={this.state.fields[o].value} placeholder={this.state.fields[o].placeholder}
                                                onChange={(x) => this.handleDateChange(x, o, this.state.fields[o].format)} onBlur={(e) => this.handleBlur(e)} inputProps={{ readOnly: true }} />
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                if (this.props.inline) {
                                    i = (
                                        <div key={o} className={'col-sm-' + this.state.fields[o].columns}>
                                            <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                                <div className="row">
                                                    {this.state.fields[o].label ?
                                                        <div className={this.state.fields[o].labelCols ? 'col-sm-' + this.state.fields[o].labelCols : 'col-sm-3'}>
                                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                                        </div> : ''}
                                                    <div className={this.state.fields[o].labelCols || this.state.fields[o].labelCols === 0 ? 'col-sm-' + (12 - this.state.fields[o].labelCols) : 'col-sm-9'}>
                                                        <Datetime id={o} dateFormat={this.state.fields[o].format} timeFormat={false} value={this.state.fields[o].value}
                                                            onChange={(x) => this.handleDateChange(x, o, this.state.fields[o].format)} onBlur={(e) => this.handleBlur(e)} inputProps={{ readOnly: true }} />
                                                    </div>
                                                    <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                                </div>
                                            </FormGroup>
                                        </div>
                                    );
                                }

                                break;
                            case 'readonly':

                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>{' '}
                                            <FormControl type="text" value={this.state.fields[o].value} onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} readOnly />
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                if (this.props.inline) {
                                    i = (
                                        <div key={o} className={'col-sm-' + this.state.fields[o].columns}>
                                            <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                                <div className="row">
                                                    {this.state.fields[o].label ?
                                                        <div className={this.state.fields[o].labelCols ? 'col-sm-' + this.state.fields[o].labelCols : 'col-sm-3'}>
                                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                                        </div> : ''}
                                                    <div className={this.state.fields[o].labelCols || this.state.fields[o].labelCols === 0 ? 'col-sm-' + (12 - this.state.fields[o].labelCols) : 'col-sm-9'}>
                                                        <FormControl type="text" value={this.state.fields[o].value} onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} readOnly />
                                                        <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                                    </div>

                                                </div>
                                            </FormGroup>
                                        </div>
                                    );
                                }

                                break;
                            case 'mask':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>

                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                            <MaskedInput
                                                mask={this.state.fields[o].mask}
                                                className="form-control"
                                                placeholder={this.state.fields[o].placeholder}
                                                guide={false}
                                                id={o}
                                                value={this.state.fields[o].value}
                                                onChange={(e) => this.handleChange(e)}
                                                onBlur={(e) => this.handleBlur(e)} />
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>

                                        </FormGroup>
                                    </Col>
                                );
                                if (this.props.inline) {
                                    i = (
                                        <div key={o} className={'col-sm-' + this.state.fields[o].columns}>
                                            <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                                <div className="row">
                                                    {this.state.fields[o].label ?
                                                        <div className={this.state.fields[o].labelCols ? 'col-sm-' + this.state.fields[o].labelCols : 'col-sm-3'}>
                                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                                        </div> : ''}
                                                    <div className={this.state.fields[o].labelCols || this.state.fields[o].labelCols === 0 ? 'col-sm-' + (12 - this.state.fields[o].labelCols) : 'col-sm-9'}>
                                                        <MaskedInput
                                                            mask={this.state.fields[o].mask}
                                                            className="form-control"
                                                            placeholder={this.state.fields[o].placeholder}
                                                            guide={false}
                                                            id={o}
                                                            value={this.state.fields[o].value}
                                                            onChange={(e) => this.handleChange(e)}
                                                            onBlur={(e) => this.handleBlur(e)} />
                                                        <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                                    </div>

                                                </div>
                                            </FormGroup>
                                        </div>
                                    );
                                }

                                break;

                            case 'radiolist':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                            <div>
                                                {this.state.fields[o].list.map((x) => <Radio key={x.value} id={x.value} name={o} value={x.value} checked={this.state.fields[o].value === x.value} onChange={(e) => this.handleChange(e)} inline onBlur={(e) => this.handleBlur(e)}>{x.text || x.value}</Radio>)}
                                            </div>
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                if (this.props.inline) {
                                    i = (
                                        <div key={o} className={'col-sm-' + this.state.fields[o].columns}>
                                            <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                                <div className="row">
                                                    {this.state.fields[o].label ?
                                                        <div className={this.state.fields[o].labelCols ? 'col-sm-' + this.state.fields[o].labelCols : 'col-sm-3'}>
                                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                                        </div> : ''}
                                                    <div className={this.state.fields[o].labelCols || this.state.fields[o].labelCols === 0 ? 'col-sm-' + (12 - this.state.fields[o].labelCols) : 'col-sm-9'}>
                                                        {this.state.fields[o].list.map((x) => <Radio key={x.value} id={x.value} name={o} value={x.value} checked={this.state.fields[o].value === x.value} onChange={(e) => this.handleChange(e)} inline onBlur={(e) => this.handleBlur(e)}>{x.text || x.value}</Radio>)}
                                                        <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                                    </div>
                                                   
                                                </div>
                                            </FormGroup>
                                        </div>
                                    );
                                }
                                break;
                            case 'select':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                            <FormControl componentClass="select" placeholder="" value={this.state.fields[o].value} onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)}>
                                                {this.state.fields[o].list.map((x) => <option key={x.value} value={x.value}>{x.text || x.value}</option>)}
                                            </FormControl>
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                if (this.props.inline) {
                                    i = (
                                        <div key={o} className={'col-sm-' + this.state.fields[o].columns}>
                                            <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                                <div className="row">
                                                    {this.state.fields[o].label ?
                                                        <div className={this.state.fields[o].labelCols ? 'col-sm-' + this.state.fields[o].labelCols : 'col-sm-3'}>
                                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                                        </div> : ''}
                                                    <div className={this.state.fields[o].labelCols || this.state.fields[o].labelCols === 0 ? 'col-sm-' + (12 - this.state.fields[o].labelCols) : 'col-sm-9'}>
                                                        <FormControl componentClass="select" placeholder="" value={this.state.fields[o].value} onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)}>
                                                            {this.state.fields[o].list.map((x) => <option key={x.value} value={x.value}>{x.text || x.value}</option>)}
                                                        </FormControl>
                                                        <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                                    </div>
                                                </div>
                                            </FormGroup>
                                        </div>
                                    );
                                }
                                break;
                            case 'textarea':
                                i = (
                                    <Col key={o} sm={this.state.fields[o].columns}>
                                        <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                            {this.state.fields[o].autosize ?
                                                <TextareaAutosize id={o} className="form-control" value={this.state.fields[o].value} placeholder={this.state.fields[o].placeholder}
                                                    onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} rows={this.state.fields[o].rows} /> : <FormControl componentClass="textarea" value={this.state.fields[o].value} placeholder={this.state.fields[o].placeholder}
                                                        onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} />}
                                            <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                        </FormGroup>
                                    </Col>
                                );
                                if (this.props.inline) {
                                    i = (
                                        <div key={o} className={'col-sm-' + this.state.fields[o].columns}>
                                            <FormGroup controlId={o} validationState={this.getValidationState(o)}>
                                                <div className="row">
                                                    {this.state.fields[o].label ?
                                                        <div className={this.state.fields[o].labelCols ? 'col-sm-' + this.state.fields[o].labelCols : 'col-sm-3'}>
                                                            <ControlLabel>{this.state.fields[o].label}</ControlLabel>
                                                        </div> : ''}
                                                    <div className={this.state.fields[o].labelCols || this.state.fields[o].labelCols === 0 ? 'col-sm-' + (12 - this.state.fields[o].labelCols) : 'col-sm-9'}>
                                                        {this.state.fields[o].autosize ?
                                                             <TextareaAutosize id={o} className="form-control" value={this.state.fields[o].value} placeholder={this.state.fields[o].placeholder}
                                                                 onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} rows={this.state.fields[o].rows} /> : <FormControl componentClass="textarea" value={this.state.fields[o].value} placeholder={this.state.fields[o].placeholder}
                                                                    onChange={(e) => this.handleChange(e)} onBlur={(e) => this.handleBlur(e)} />}
                                                        <HelpBlock>{this.getErrorMsg(o)}</HelpBlock>
                                                    </div>
                                                    
                                                </div>
                                            </FormGroup>
                                        </div>
                                    );
                                }
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
                <div key="actionBtn" className={this.props.actionsCols ? 'col-sm-'+ this.props.actionsCols : 'col-sm-12'}>
                    {this.state.actions.map((v, i) => <Fragment key={i}>{v} </Fragment>)}
                </div>
            </div>
        );
    }
}


FormFields.propTypes = {
    fields: PropTypes.objectOf(PropTypes.object).isRequired,
    id: PropTypes.string.isRequired,
    resources: PropTypes.objectOf(PropTypes.string).isRequired,
    onChange: PropTypes.func,
    onBlurField: PropTypes.func,
    editMode: PropTypes.bool,
    actionsCols: PropTypes.number,
    actions: PropTypes.array,
    inline: PropTypes.bool
};
