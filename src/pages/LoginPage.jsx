import Logo from '@components/common/Logo';
import { useAuth } from '@contexts/AuthContext';
import {
  clearPendingReturnTo,
  sanitizeReturnTo,
  stashPendingReturnTo,
} from '@utils/returnTo';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const LogoLink = styled(Link)`
  align-self: center;
  margin-bottom: 40px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
`;

const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.secondary};
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  font-size: 0.9rem;
  font-family: inherit;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  box-sizing: border-box;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: -1px;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 10px 12px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textDark};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const OrSeparator = styled.div`
  text-align: center;
  margin: 16px 0;
  color: ${({ theme }) => theme.colors.secondary};
  font-size: 0.8rem;
`;

const ErrorMessage = styled.div`
  color: #c62828;
  font-size: 0.85rem;
  margin-top: 12px;
  text-align: center;
`;

const GoogleButton = styled.button`
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-appearance: none;
  background-color: white;
  background-image: none;
  border: 1px solid #747775;
  border-radius: 8px;
  box-sizing: border-box;
  color: #1f1f1f;
  cursor: pointer;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 14px;
  height: 40px;
  letter-spacing: 0.25px;
  outline: none;
  overflow: hidden;
  padding: 0 12px;
  position: relative;
  text-align: center;
  transition:
    background-color 0.218s,
    border-color 0.218s,
    box-shadow 0.218s;
  vertical-align: middle;
  white-space: nowrap;
  width: 100%;

  &:disabled {
    cursor: default;
    background-color: #ffffff61;
    border-color: #1f1f1f1f;
  }

  &:not(:disabled):active,
  &:not(:disabled):focus {
    .button-state {
      background-color: #303030;
      opacity: 0.12;
    }
  }

  &:not(:disabled):hover {
    box-shadow:
      0 1px 2px 0 rgba(60, 64, 67, 0.3),
      0 1px 3px 1px rgba(60, 64, 67, 0.15);

    .button-state {
      background-color: #303030;
      opacity: 0.08;
    }
  }
`;

const ButtonState = styled.div`
  transition: opacity 0.218s;
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
`;

const ButtonContentWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  height: 100%;
  justify-content: space-between;
  position: relative;
  width: 100%;
`;

const ButtonContents = styled.span`
  flex-grow: 1;
  font-family: 'Roboto', arial, sans-serif;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
`;

const ButtonIcon = styled.div`
  height: 20px;
  margin-right: 12px;
  min-width: 20px;
  width: 20px;
  display: block;

  svg {
    height: 100%;
    width: 100%;
  }
`;

function GoogleIcon() {
  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      style={{ display: 'block' }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      ></path>
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      ></path>
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      ></path>
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      ></path>
      <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
  );
}

function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const returnTo = sanitizeReturnTo(searchParams.get('returnTo')) || '/';

  // 이미 로그인된 상태에서는 로그인 페이지를 보여줄 이유가 없다.
  if (!loading && user) {
    return <Navigate to={returnTo} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    // A stash left by an abandoned Google login must not override this returnTo.
    clearPendingReturnTo();
    try {
      await login(username, password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    stashPendingReturnTo(returnTo);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    window.location.href = `${apiBaseUrl}/oauth2/authorization/google`;
  };

  return (
    <Page>
      <Helmet>
        <title>Login | Unblind</title>
      </Helmet>
      <Card>
        <LogoLink to="/" aria-label="홈으로">
          <Logo variant="black" size={48} />
        </LogoLink>

        <GoogleButton type="button" onClick={handleGoogleLogin}>
          <ButtonState className="button-state" />
          <ButtonContentWrapper>
            <ButtonIcon>
              <GoogleIcon />
            </ButtonIcon>
            <ButtonContents>Continue with Google</ButtonContents>
          </ButtonContentWrapper>
        </GoogleButton>

        <OrSeparator>OR</OrSeparator>

        <form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field>
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <SubmitButton type="submit" disabled={submitting}>
            Login
          </SubmitButton>
          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        </form>
      </Card>
    </Page>
  );
}

export default LoginPage;
