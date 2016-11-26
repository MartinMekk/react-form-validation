import React, { createElement, PropTypes as PT, Component } from 'react';
import { findDOMNode } from 'react-dom';
import { Fields, reduxForm } from 'redux-form';
import { connect } from 'react-redux';
import { feedbackSummaryFactory } from './feedback-summary';
import validation from './validate';

function getSubmittokenFromStore(form) {
    return (state) => ({
        submittoken: state.form[form].submittoken
    });
}

export default function validForm(config) {
    const { form, validate, listCreator, elementCreator, ...rest } = config;

    const defaultSummary = feedbackSummaryFactory(listCreator, elementCreator);

    const fields = Object.keys(validate);

    return (WrappedComponent) => {
        const mappedConfig = {
            form,
            validate: validation(validate),
            ...rest
        };

        class Wrapper extends Component {
            handleSubmitProxy(...args) {
                return Promise.resolve(this.props.handleSubmit(...args))
                    .then((result) => {
                        if (typeof result !== 'object') {
                            // Resolved ok from onSubmit promise
                            return result;
                        }
                        // Rejected from onSubmit promise
                        // Result contains keys from fields, then it had a validation error
                        const hasField = Object.keys(result)
                            .find((errorField) => fields.includes(errorField));

                        if (hasField) {
                            // eslint-disable-next-line react/no-string-refs
                            const summary = this.refs.panel.getRenderedComponent();
                            findDOMNode(summary).focus(); // eslint-disable-line react/no-find-dom-node
                        }

                        return result;
                    });
            }

            render() {
                const { submittoken, ...props } = this.props;

                const errorSummary = (
                    <Fields
                        names={fields}
                        component={defaultSummary}
                        submittoken={submittoken}
                        withRef
                        ref="panel" // eslint-disable-line react/no-string-refs
                    />
                );
                const useProps = {
                    ...props,
                    errorSummary,
                    handleSubmit: this.handleSubmitProxy.bind(this)
                };

                return createElement(WrappedComponent, useProps);
            }
        }

        Wrapper.propTypes = {
            handleSubmit: PT.func.isRequired,
            submittoken: PT.string
        };

        return reduxForm(mappedConfig)(connect(getSubmittokenFromStore(form))(Wrapper));
    };
}
